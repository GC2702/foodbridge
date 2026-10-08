const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

let posts = [];
let claims = [];

function syncStatuses() {
  const now = Date.now();
  posts.forEach(post => {
    if (new Date(post.bestBefore).getTime() <= now || post.remainingServings <= 0) {
      post.status = 'CLOSED';
    }
  });
}

app.get('/api/posts', (req, res) => {
  syncStatuses();
  const sorted = [...posts].sort(
    (a, b) => new Date(a.bestBefore).getTime() - new Date(b.bestBefore).getTime()
  );
  res.json(sorted);
});

app.post('/api/posts', (req, res) => {
  const { title, totalServings, pickupPoint, bestBefore } = req.body;
  if (!title || !totalServings || !pickupPoint || !bestBefore) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const newPost = {
    id: Date.now().toString(),
    title,
    totalServings: Number(totalServings),
    remainingServings: Number(totalServings),
    pickupPoint,
    bestBefore,
    status: 'OPEN',
    createdAt: new Date().toISOString()
  };

  posts.push(newPost);
  res.status(201).json(newPost);
});

app.post('/api/posts/:id/claims', (req, res) => {
  syncStatuses();
  const { id } = req.params;
  const { regNo, quantity } = req.body;
  const qty = Number(quantity);

  const post = posts.find(p => p.id === id);
  if (!post) {
    return res.status(404).json({ error: 'Post not found.' });
  }

  if (post.status === 'CLOSED' || new Date(post.bestBefore).getTime() <= Date.now()) {
    post.status = 'CLOSED';
    return res.status(400).json({ error: 'Post is closed or expired.' });
  }

  if (!qty || qty <= 0 || qty > post.remainingServings) {
    return res.status(400).json({ error: `Invalid quantity. Only ${post.remainingServings} left.` });
  }

  post.remainingServings -= qty;
  if (post.remainingServings === 0) {
    post.status = 'CLOSED';
  }

  const claim = {
    id: Date.now().toString(),
    postId: id,
    regNo: regNo || 'Anonymous',
    quantity: qty,
    timestamp: new Date().toISOString()
  };
  claims.push(claim);

  res.status(200).json({ success: true, post, claim });
});

app.get('/api/stats', (req, res) => {
  syncStatuses();
  const servingsSaved = claims.reduce((acc, c) => acc + c.quantity, 0);
  const servingsMissed = posts
    .filter(p => p.status === 'CLOSED' || new Date(p.bestBefore).getTime() <= Date.now())
    .reduce((acc, p) => acc + p.remainingServings, 0);

  res.json({ servingsSaved, servingsMissed });
});

app.post('/api/reset', (req, res) => {
  posts = [];
  claims = [];
  res.json({ success: true, message: 'All data cleared successfully' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));