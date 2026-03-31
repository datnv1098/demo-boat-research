#!/usr/bin/env python3
"""
Deploy frontend to an Ubuntu server over SSH.

Behavior:
- Branch A (`update`): update an already healthy server that has
  `/var/www/fisheries-demo` and is running with PM2 + Nginx.
- Branch B (`bootstrap`): provision the server from scratch if the healthy
  Branch A conditions are not met.

Rollback:
- Rollback is only enabled when the server is healthy before deployment.
- If the server is already unhealthy before deployment, the script skips
  rollback to avoid restoring a broken state.
- On successful deployment the backup is deleted, so the old version is
  cleared after the new release is verified.
"""

from __future__ import annotations

import argparse
import json
import os
import shlex
import shutil
import stat
import subprocess
import sys
import tarfile
import tempfile
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, Optional


SCRIPT_DIR = Path(__file__).resolve().parent


class DeployError(RuntimeError):
    pass


@dataclass
class Config:
    host: str
    user: str
    key: Path
    app_dir: str
    pm2_name: str
    domain: str
    port: int
    nginx_site: str
    mode: str
    skip_build: bool
    api_base_url: Optional[str]
    strict_host_key_checking: bool
    staged_key: Optional[Path] = None

    @property
    def target(self) -> str:
        return f"{self.user}@{self.host}"


def log(message: str) -> None:
    print(f"[deploy] {message}")


def run_local(
    args: Iterable[str],
    *,
    cwd: Optional[Path] = None,
    env: Optional[Dict[str, str]] = None,
    check: bool = True,
    capture_output: bool = False,
    input_text: Optional[str] = None,
    retries: int = 0,
    retry_delay_seconds: float = 5.0,
) -> subprocess.CompletedProcess[str]:
    cmd = [str(a) for a in args]
    attempt = 0
    while True:
        attempt += 1
        log(f"local$ {' '.join(shlex.quote(part) for part in cmd)}")
        result = subprocess.run(
            cmd,
            cwd=str(cwd) if cwd else None,
            env=env,
            input=input_text,
            text=True,
            capture_output=capture_output,
            check=False,
        )
        if result.returncode == 0 or attempt > retries + 1:
            break
        delay = retry_delay_seconds * attempt
        log(
            f"Command failed with exit code {result.returncode}; "
            f"retrying in {delay:.0f}s (attempt {attempt}/{retries + 1})"
        )
        time.sleep(delay)
    if check and result.returncode != 0:
        raise DeployError(
            f"Local command failed ({result.returncode}): {' '.join(cmd)}\n"
            f"{result.stderr or result.stdout}"
        )
    return result


def ensure_command(name: str) -> None:
    if shutil.which(name) is None:
        raise DeployError(f"Required command not found in PATH: {name}")


def ensure_ssh_key_permissions(key_path: Path) -> None:
    if os.name != "posix" or not key_path.exists():
        return
    mode = stat.S_IMODE(key_path.stat().st_mode)
    if mode != 0o400:
        log(f"Adjusting SSH key permissions to 400: {key_path}")
        key_path.chmod(0o400)


def prepare_ssh_key(config: Config) -> None:
    ensure_ssh_key_permissions(config.key)
    if os.name != "posix":
        config.staged_key = config.key
        return

    mode = stat.S_IMODE(config.key.stat().st_mode)
    if mode == 0o400:
        config.staged_key = config.key
        return

    temp_dir = Path(tempfile.mkdtemp(prefix="frontend-ssh-key-"))
    staged_key = temp_dir / config.key.name
    shutil.copy2(config.key, staged_key)
    staged_key.chmod(0o400)
    log(f"Using staged SSH key with strict permissions: {staged_key}")
    config.staged_key = staged_key


def active_ssh_key(config: Config) -> Path:
    return config.staged_key or config.key


def ssh_base_args(config: Config) -> list[str]:
    strict_value = "yes" if config.strict_host_key_checking else "no"
    return [
        "ssh",
        "-i",
        str(active_ssh_key(config)),
        "-o",
        f"StrictHostKeyChecking={strict_value}",
        "-o",
        "BatchMode=yes",
        "-o",
        "ConnectTimeout=15",
    ]


def scp_base_args(config: Config) -> list[str]:
    strict_value = "yes" if config.strict_host_key_checking else "no"
    return [
        "scp",
        "-i",
        str(active_ssh_key(config)),
        "-o",
        f"StrictHostKeyChecking={strict_value}",
        "-o",
        "BatchMode=yes",
        "-o",
        "ConnectTimeout=15",
    ]


def sftp_base_args(config: Config) -> list[str]:
    strict_value = "yes" if config.strict_host_key_checking else "no"
    return [
        "sftp",
        "-B",
        "1024",
        "-R",
        "1",
        "-i",
        str(active_ssh_key(config)),
        "-o",
        f"StrictHostKeyChecking={strict_value}",
        "-o",
        "BatchMode=yes",
    ]


def run_remote_script(
    config: Config,
    script: str,
    *script_args: str,
    check: bool = True,
) -> subprocess.CompletedProcess[str]:
    cmd = ssh_base_args(config) + [config.target, "bash", "-s", "--", *script_args]
    return run_local(
        cmd,
        input_text=script,
        capture_output=True,
        check=check,
        retries=4,
        retry_delay_seconds=5,
    )


def upload_file(config: Config, local_path: Path, remote_path: str) -> None:
    batch = f"put {shlex.quote(str(local_path))} {shlex.quote(remote_path)}\n"
    cmd = sftp_base_args(config) + [config.target]
    run_local(cmd, input_text=batch, retries=4, retry_delay_seconds=5)


def build_frontend(config: Config) -> None:
    env = os.environ.copy()
    if config.api_base_url:
        env["VITE_API_BASE_URL"] = config.api_base_url
        log(f"Using VITE_API_BASE_URL={config.api_base_url}")
    run_local(["npm", "run", "build"], cwd=SCRIPT_DIR, env=env)


def create_runtime_package() -> dict:
    package_json = json.loads((SCRIPT_DIR / "package.json").read_text(encoding="utf-8"))
    express_version = (
        package_json.get("dependencies", {}).get("express")
        or package_json.get("devDependencies", {}).get("express")
        or "^5.2.1"
    )
    return {
        "name": package_json.get("name", "fisheries-analytics-demo"),
        "private": True,
        "version": package_json.get("version", "0.0.0"),
        "type": package_json.get("type", "module"),
        "main": "server.js",
        "scripts": {"start": "node server.js"},
        "dependencies": {"express": express_version},
        "engines": {"node": ">=18.0.0"},
    }


def create_release_archive() -> Path:
    dist_dir = SCRIPT_DIR / "dist"
    server_js = SCRIPT_DIR / "server.js"
    if not dist_dir.is_dir():
        raise DeployError(f"Missing build output: {dist_dir}")
    if not server_js.is_file():
        raise DeployError(f"Missing runtime server file: {server_js}")

    temp_dir = Path(tempfile.mkdtemp(prefix="frontend-release-"))
    release_dir = temp_dir / "release"
    release_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(server_js, release_dir / "server.js")
    shutil.copytree(dist_dir, release_dir / "dist")
    (release_dir / "package.json").write_text(
        json.dumps(create_runtime_package(), indent=2) + "\n",
        encoding="utf-8",
    )

    archive_path = temp_dir / "frontend-release.tar.gz"
    with tarfile.open(archive_path, "w:gz") as archive:
        archive.add(release_dir / "server.js", arcname="server.js")
        archive.add(release_dir / "package.json", arcname="package.json")
        archive.add(release_dir / "dist", arcname="dist")
    return archive_path


def parse_state_output(stdout: str) -> Dict[str, str]:
    state: Dict[str, str] = {}
    for line in stdout.splitlines():
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        state[key.strip()] = value.strip()
    return state


def detect_remote_state(config: Config) -> Dict[str, str]:
    script = r"""#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$1"
PM2_NAME="$2"
PORT="$3"

pm2_available() {
  if command -v pm2 >/dev/null 2>&1; then
    return 0
  fi
  if [ -x "$APP_DIR/node_modules/.bin/pm2" ]; then
    return 0
  fi
  return 1
}

pm2_run() {
  if command -v pm2 >/dev/null 2>&1; then
    pm2 "$@"
  else
    "$APP_DIR/node_modules/.bin/pm2" "$@"
  fi
}

app_dir_exists=0
nginx_active=0
pm2_running=0
port_3000_ok=0
nginx_http_ok=0
rollback_ready=0

if [ -d "$APP_DIR" ]; then
  app_dir_exists=1
fi

if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet nginx; then
  nginx_active=1
fi

if pm2_available && pm2_run describe "$PM2_NAME" >/dev/null 2>&1; then
  pm2_running=1
fi

if command -v curl >/dev/null 2>&1 && curl -fsS "http://localhost:$PORT" >/dev/null 2>&1; then
  port_3000_ok=1
fi

if command -v curl >/dev/null 2>&1 && curl -fsS http://localhost >/dev/null 2>&1; then
  nginx_http_ok=1
fi

if [ "$app_dir_exists" = "1" ] && [ "$nginx_active" = "1" ] && [ "$pm2_running" = "1" ] && [ "$port_3000_ok" = "1" ]; then
  rollback_ready=1
fi

if [ "$app_dir_exists" = "1" ] && [ "$nginx_active" = "1" ] && [ "$pm2_running" = "1" ]; then
  branch="update"
else
  branch="bootstrap"
fi

printf 'app_dir_exists=%s\n' "$app_dir_exists"
printf 'nginx_active=%s\n' "$nginx_active"
printf 'pm2_running=%s\n' "$pm2_running"
printf 'port_ok=%s\n' "$port_3000_ok"
printf 'nginx_http_ok=%s\n' "$nginx_http_ok"
printf 'rollback_ready=%s\n' "$rollback_ready"
printf 'branch=%s\n' "$branch"
"""
    result = run_remote_script(
        config,
        script,
        config.app_dir,
        config.pm2_name,
        str(config.port),
    )
    return parse_state_output(result.stdout)


def remote_deploy_script() -> str:
    return r"""#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$1"
RELEASE_TGZ="$2"
PM2_NAME="$3"
DOMAIN="$4"
BACKUP_DIR="$5"
MODE="$6"
ROLLBACK_ENABLED="$7"
NGINX_SITE="$8"
PORT="$9"

STAGING_DIR="/tmp/${PM2_NAME}-release-$(date +%Y%m%d%H%M%S)"
APP_PARENT="$(dirname "$APP_DIR")"
SERVER_NAME="${DOMAIN:-_}"

log() {
  printf '[remote] %s\n' "$*"
}

pm2_available() {
  if command -v pm2 >/dev/null 2>&1; then
    return 0
  fi
  if [ -x "$APP_DIR/node_modules/.bin/pm2" ]; then
    return 0
  fi
  return 1
}

pm2_run() {
  if command -v pm2 >/dev/null 2>&1; then
    pm2 "$@"
  else
    "$APP_DIR/node_modules/.bin/pm2" "$@"
  fi
}

ensure_node() {
  local major=0
  if command -v node >/dev/null 2>&1; then
    major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || printf '0')"
  fi
  if [ "$major" -lt 18 ]; then
    log "Installing Node.js 20"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
  fi
}

bootstrap_server() {
  log "Bootstrapping server dependencies"
  export DEBIAN_FRONTEND=noninteractive
  sudo apt-get update
  sudo apt-get install -y nginx curl ca-certificates tar
  ensure_node
  if ! pm2_available; then
    log "Installing PM2"
    sudo npm install -g pm2
  fi
  sudo mkdir -p "$APP_PARENT"
  sudo mkdir -p "$APP_DIR"
  sudo chown -R "$USER:$USER" "$APP_DIR"
}

backup_current_release() {
  if [ "$ROLLBACK_ENABLED" != "1" ]; then
    log "Skipping backup because server is not healthy before deploy"
    return
  fi
  if [ -d "$APP_DIR" ]; then
    log "Backing up current release to $BACKUP_DIR"
    sudo rm -rf "$BACKUP_DIR"
    sudo cp -a "$APP_DIR" "$BACKUP_DIR"
    sudo chown -R "$USER:$USER" "$BACKUP_DIR"
  fi
}

install_release() {
  log "Extracting release archive"
  rm -rf "$STAGING_DIR"
  mkdir -p "$STAGING_DIR"
  tar -xzf "$RELEASE_TGZ" -C "$STAGING_DIR"

  log "Replacing application files in $APP_DIR"
  sudo rm -rf "$APP_DIR"
  sudo mkdir -p "$APP_DIR"
  sudo install -m 0644 "$STAGING_DIR/server.js" "$APP_DIR/server.js"
  sudo install -m 0644 "$STAGING_DIR/package.json" "$APP_DIR/package.json"
  sudo mkdir -p "$APP_DIR/dist"
  sudo cp -a "$STAGING_DIR/dist/." "$APP_DIR/dist/"
  sudo chown -R "$USER:$USER" "$APP_DIR"

  log "Installing runtime dependencies"
  cd "$APP_DIR"
  npm install --omit=dev
}

configure_nginx() {
  log "Configuring Nginx site $NGINX_SITE"
  cat > "$STAGING_DIR/nginx.conf" <<EOF
server {
    listen 80;
    server_name $SERVER_NAME;

    location / {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
  sudo install -m 0644 "$STAGING_DIR/nginx.conf" "/etc/nginx/sites-available/$NGINX_SITE"
  sudo ln -sf "/etc/nginx/sites-available/$NGINX_SITE" "/etc/nginx/sites-enabled/$NGINX_SITE"
  sudo rm -f /etc/nginx/sites-enabled/default
  sudo nginx -t
  sudo systemctl enable nginx
  sudo systemctl restart nginx
}

start_application() {
  log "Starting application with PM2"
  cd "$APP_DIR"
  if pm2_available && pm2_run describe "$PM2_NAME" >/dev/null 2>&1; then
    pm2_run restart "$PM2_NAME" --update-env
  else
    pm2_run start "$APP_DIR/server.js" --name "$PM2_NAME"
  fi
  pm2_run save
}

verify_release() {
  log "Verifying application health"
  curl -fsS "http://localhost:$PORT" >/dev/null
  curl -fsS http://localhost >/dev/null
}

cleanup_success() {
  log "Cleaning old release data"
  rm -rf "$STAGING_DIR" "$RELEASE_TGZ"
  if [ -n "$BACKUP_DIR" ] && [ -d "$BACKUP_DIR" ]; then
    sudo rm -rf "$BACKUP_DIR"
  fi
}

main() {
  log "Deploy mode: $MODE"
  if [ "$MODE" = "bootstrap" ]; then
    bootstrap_server
  else
    ensure_node
  fi
  backup_current_release
  install_release
  configure_nginx
  start_application
  verify_release
  cleanup_success
  printf 'DEPLOY_OK\n'
}

main
"""


def remote_rollback_script() -> str:
    return r"""#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$1"
BACKUP_DIR="$2"
PM2_NAME="$3"
PORT="$4"

log() {
  printf '[rollback] %s\n' "$*"
}

pm2_available() {
  if command -v pm2 >/dev/null 2>&1; then
    return 0
  fi
  if [ -x "$APP_DIR/node_modules/.bin/pm2" ]; then
    return 0
  fi
  if [ -x "$BACKUP_DIR/node_modules/.bin/pm2" ]; then
    return 0
  fi
  return 1
}

pm2_run() {
  if command -v pm2 >/dev/null 2>&1; then
    pm2 "$@"
  elif [ -x "$APP_DIR/node_modules/.bin/pm2" ]; then
    "$APP_DIR/node_modules/.bin/pm2" "$@"
  else
    "$BACKUP_DIR/node_modules/.bin/pm2" "$@"
  fi
}

if [ ! -d "$BACKUP_DIR" ]; then
  printf 'ROLLBACK_SKIPPED_NO_BACKUP\n'
  exit 0
fi

log "Restoring backup from $BACKUP_DIR"
sudo rm -rf "$APP_DIR"
sudo mv "$BACKUP_DIR" "$APP_DIR"
sudo chown -R "$USER:$USER" "$APP_DIR"

if pm2_available; then
  if pm2_run describe "$PM2_NAME" >/dev/null 2>&1; then
    pm2_run restart "$PM2_NAME" --update-env || true
  elif [ -f "$APP_DIR/server.js" ]; then
    pm2_run start "$APP_DIR/server.js" --name "$PM2_NAME" || true
  fi
  pm2_run save || true
fi

if command -v curl >/dev/null 2>&1; then
  curl -fsS "http://localhost:$PORT" >/dev/null || true
fi

printf 'ROLLBACK_OK\n'
"""


def deploy_mode(config: Config, detected_branch: str) -> str:
    if config.mode == "auto":
        return detected_branch
    return config.mode


def deploy(config: Config) -> None:
    ensure_command("ssh")
    ensure_command("sftp")
    ensure_command("npm")
    prepare_ssh_key(config)

    if not config.skip_build:
        log("Building frontend locally")
        build_frontend(config)
    else:
        log("Skipping local build as requested")

    state = detect_remote_state(config)
    selected_mode = deploy_mode(config, state.get("branch", "bootstrap"))
    rollback_enabled = selected_mode == "update" and state.get("rollback_ready") == "1"

    log(
        "Remote state: "
        f"branch={state.get('branch')} "
        f"app_dir_exists={state.get('app_dir_exists')} "
        f"nginx_active={state.get('nginx_active')} "
        f"pm2_running={state.get('pm2_running')} "
        f"rollback_ready={state.get('rollback_ready')}"
    )
    log(f"Selected deploy mode: {selected_mode}")
    if rollback_enabled:
        log("Rollback is enabled because the current deployment is healthy")
    else:
        log("Rollback is disabled because the server is not healthy before deploy")

    archive_path = create_release_archive()
    backup_dir = f"{config.app_dir}-backup-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
    remote_archive = f"/tmp/{config.pm2_name}-release-{os.getpid()}.tar.gz"

    try:
        log(f"Uploading release archive to {remote_archive}")
        upload_file(config, archive_path, remote_archive)
        result = run_remote_script(
            config,
            remote_deploy_script(),
            config.app_dir,
            remote_archive,
            config.pm2_name,
            config.domain,
            backup_dir,
            selected_mode,
            "1" if rollback_enabled else "0",
            config.nginx_site,
            str(config.port),
            check=False,
        )
        if result.stdout:
            sys.stdout.write(result.stdout)
        if result.stderr:
            sys.stderr.write(result.stderr)
        if result.returncode != 0:
            raise DeployError(f"Remote deploy failed with exit code {result.returncode}")
        log("Deployment completed successfully")
    except Exception as exc:
        log(f"Deployment failed: {exc}")
        if rollback_enabled:
            log("Attempting rollback")
            rollback_result = run_remote_script(
                config,
                remote_rollback_script(),
                config.app_dir,
                backup_dir,
                config.pm2_name,
                str(config.port),
                check=False,
            )
            if rollback_result.stdout:
                sys.stdout.write(rollback_result.stdout)
            if rollback_result.stderr:
                sys.stderr.write(rollback_result.stderr)
            if rollback_result.returncode != 0:
                raise DeployError(
                    "Deployment failed and rollback also failed.\n"
                    f"Rollback exit code: {rollback_result.returncode}"
                ) from exc
        raise
    finally:
        if archive_path.exists():
            shutil.rmtree(archive_path.parent, ignore_errors=True)
        if config.staged_key and config.staged_key != config.key:
            shutil.rmtree(config.staged_key.parent, ignore_errors=True)


def parse_args() -> Config:
    parser = argparse.ArgumentParser(
        description="Deploy frontend to Ubuntu with auto update/bootstrap behavior."
    )
    parser.add_argument("--host", default="18.141.158.6")
    parser.add_argument("--user", default="ubuntu")
    parser.add_argument("--key", default=str(SCRIPT_DIR / "key" / "EC2PEM.pem"))
    parser.add_argument("--app-dir", default="/var/www/fisheries-demo")
    parser.add_argument("--pm2-name", default="fisheries-demo")
    parser.add_argument("--domain", default="demo.boatresearch.site")
    parser.add_argument("--port", type=int, default=3000)
    parser.add_argument("--nginx-site", default="demo")
    parser.add_argument(
        "--mode",
        choices=["auto", "update", "bootstrap"],
        default="auto",
        help="auto: detect branch, update: force Branch A, bootstrap: force Branch B",
    )
    parser.add_argument("--skip-build", action="store_true")
    parser.add_argument(
        "--api-base-url",
        help="Optional VITE_API_BASE_URL used during local build.",
    )
    parser.add_argument(
        "--strict-host-key-checking",
        action="store_true",
        help="Enable OpenSSH strict host key checking. Disabled by default.",
    )
    args = parser.parse_args()

    return Config(
        host=args.host,
        user=args.user,
        key=Path(args.key).resolve(),
        app_dir=args.app_dir,
        pm2_name=args.pm2_name,
        domain=args.domain,
        port=args.port,
        nginx_site=args.nginx_site,
        mode=args.mode,
        skip_build=args.skip_build,
        api_base_url=args.api_base_url,
        strict_host_key_checking=args.strict_host_key_checking,
    )


def main() -> int:
    try:
        config = parse_args()
        deploy(config)
        return 0
    except DeployError as exc:
        print(f"[deploy] ERROR: {exc}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("[deploy] Interrupted by user", file=sys.stderr)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
