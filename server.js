const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'dist')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Fallback for all other routes (SPA routing)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`🌊 Fisheries Analytics Demo running on port ${port}`);
  console.log(`🐟 Excel data integration: 22 real trips + enhanced mock data`);
  console.log(`🇹🇭 100% Thai language interface`);
});
