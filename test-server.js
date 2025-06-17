const express = require('express');
const path = require('path');

const app = express();
const port = 5000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/dist')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
