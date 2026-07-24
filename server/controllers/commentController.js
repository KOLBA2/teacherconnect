const pool = require('../config/db');
const { sendDbError } = require('../utils/dbErrors');
const { UUID_REGEX } = require('../utils/validators');
const { isPremiumSql } = require('../utils/packages');

function mapComment(row) {
  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    userName: row.user_name,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.is_featured !== undefined && { isFeatured: row.is_featured === true }),
    // The comment author's star rating on this post (null if they never rated).
    // Drives which comments a VIP teacher is allowed to feature (5★ only).
    ...(row.author_stars !== undefined && {
      authorStars: row.author_stars != null ? Number(row.author_stars) : null,
    }),
  };
}

async function getComments(req, res) {
  const { id } = req.params;

  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ message: 'არასწორი პოსტის ID' });
  }

  try {
    // Featured review pinned to the top; the rest oldest-first as before.
    const result = await pool.query(
      `SELECT c.id, c.post_id, c.user_id, c.content, c.created_at, c.updated_at, c.is_featured,
              u.name AS user_name,
              r.stars AS author_stars
       FROM comments c
       JOIN users u ON u.id = c.user_id
       LEFT JOIN ratings r ON r.post_id = c.post_id AND r.user_id = c.user_id
       WHERE c.post_id = $1
       ORDER BY c.is_featured DESC, c.created_at ASC`,
      [id],
    );
    return res.status(200).json({ comments: result.rows.map(mapComment) });
  } catch (err) {
    console.error('Fetching comments failed:', err);
    return sendDbError(res, err, 'კომენტარების ჩატვირთვა ვერ მოხერხდა');
  }
}

// ── Module 2: featured review (VIP/VIP+ exclusive) ──
// The post owner pins one 5★ reviewer's comment to the top. Calling again on the
// same comment unfeatures it.
async function featureComment(req, res) {
  const { id, commentId } = req.params; // id = post id

  if (!UUID_REGEX.test(id) || !UUID_REGEX.test(commentId)) {
    return res.status(400).json({ message: 'არასწორი ID' });
  }

  let client;
  try {
    const info = await pool.query(
      `SELECT c.is_featured, c.user_id AS author_id, p.teacher_id,
              r.stars AS author_stars, ${isPremiumSql('p', 'u')} AS is_premium
         FROM comments c
         JOIN posts p ON p.id = c.post_id
         JOIN users u ON u.id = p.teacher_id
         LEFT JOIN ratings r ON r.post_id = c.post_id AND r.user_id = c.user_id
        WHERE c.id = $1 AND c.post_id = $2`,
      [commentId, id],
    );
    const row = info.rows[0];
    if (!row) return res.status(404).json({ message: 'კომენტარი ვერ მოიძებნა' });
    if (row.teacher_id !== req.user.id) {
      return res.status(403).json({ message: 'მხოლოდ პოსტის ავტორს შეუძლია მიმოხილვის დამაგრება' });
    }
    if (!row.is_premium) {
      return res.status(403).json({ message: 'რჩეული მიმოხილვა ხელმისაწვდომია მხოლოდ VIP პაკეტებზე' });
    }

    // Toggle off if already featured.
    if (row.is_featured) {
      await pool.query('UPDATE comments SET is_featured = FALSE WHERE id = $1', [commentId]);
      return res.status(200).json({ message: 'დამაგრება მოიხსნა', featured: false });
    }

    if (Number(row.author_stars) !== 5) {
      return res.status(400).json({ message: 'დამაგრება შესაძლებელია მხოლოდ 5★ შეფასების მქონე მიმოხილვის' });
    }

    // One featured per post: clear the old one, set the new one, atomically
    // (the partial unique index would otherwise reject two featured rows).
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query('UPDATE comments SET is_featured = FALSE WHERE post_id = $1 AND is_featured', [id]);
    await client.query('UPDATE comments SET is_featured = TRUE WHERE id = $1', [commentId]);
    await client.query('COMMIT');
    return res.status(200).json({ message: 'მიმოხილვა დამაგრდა ⭐', featured: true });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Featuring comment failed:', err);
    return sendDbError(res, err, 'მიმოხილვის დამაგრება ვერ მოხერხდა');
  } finally {
    if (client) client.release();
  }
}

async function addComment(req, res) {
  const { id } = req.params;
  const { content } = req.body;

  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ message: 'არასწორი პოსტის ID' });
  }
  if (!content || !content.trim()) {
    return res.status(400).json({ message: 'კომენტარი ცარიელია' });
  }

  try {
    const postExists = await pool.query('SELECT id FROM posts WHERE id = $1', [id]);
    if (!postExists.rows[0]) {
      return res.status(404).json({ message: 'პოსტი ვერ მოიძებნა' });
    }

    const result = await pool.query(
      `INSERT INTO comments (post_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, post_id, user_id, content, created_at, updated_at`,
      [id, req.user.id, content.trim()],
    );

    const nameResult = await pool.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
    const comment = mapComment({ ...result.rows[0], user_name: nameResult.rows[0]?.name });

    return res.status(201).json({ message: 'კომენტარი დაემატა', comment });
  } catch (err) {
    console.error('Adding comment failed:', err);
    return sendDbError(res, err, 'კომენტარის დამატება ვერ მოხერხდა');
  }
}

async function updateComment(req, res) {
  const { id } = req.params;
  const { content } = req.body;

  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ message: 'არასწორი კომენტარის ID' });
  }
  if (!content || !content.trim()) {
    return res.status(400).json({ message: 'კომენტარი ცარიელია' });
  }

  try {
    const existing = await pool.query('SELECT user_id FROM comments WHERE id = $1', [id]);
    if (!existing.rows[0]) {
      return res.status(404).json({ message: 'კომენტარი ვერ მოიძებნა' });
    }
    // Editing is reserved for the comment's author alone — the post author
    // and admin may remove others' comments, but never rewrite them.
    if (existing.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ message: 'სხვისი კომენტარის რედაქტირება შეუძლებელია' });
    }

    const result = await pool.query(
      `UPDATE comments SET content = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING id, post_id, user_id, content, created_at, updated_at`,
      [id, content.trim()],
    );

    const nameResult = await pool.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
    const comment = mapComment({ ...result.rows[0], user_name: nameResult.rows[0]?.name });

    return res.status(200).json({ message: 'კომენტარი განახლდა ✓', comment });
  } catch (err) {
    console.error('Updating comment failed:', err);
    return sendDbError(res, err, 'კომენტარის განახლება ვერ მოხერხდა');
  }
}

async function deleteComment(req, res) {
  const { id } = req.params;

  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ message: 'არასწორი კომენტარის ID' });
  }

  try {
    const existing = await pool.query(
      `SELECT c.user_id, p.teacher_id
       FROM comments c
       JOIN posts p ON p.id = c.post_id
       WHERE c.id = $1`,
      [id],
    );
    const row = existing.rows[0];
    if (!row) {
      return res.status(404).json({ message: 'კომენტარი ვერ მოიძებნა' });
    }

    const isCommentAuthor = row.user_id === req.user.id;
    const isPostAuthor = row.teacher_id === req.user.id;
    const isAdminUser = req.user.role === 'admin';
    if (!isCommentAuthor && !isPostAuthor && !isAdminUser) {
      return res.status(403).json({ message: 'ამ კომენტარის წაშლის უფლება არ გაქვთ' });
    }

    await pool.query('DELETE FROM comments WHERE id = $1', [id]);
    return res.status(200).json({ message: 'კომენტარი წაიშალა' });
  } catch (err) {
    console.error('Deleting comment failed:', err);
    return sendDbError(res, err, 'კომენტარის წაშლა ვერ მოხერხდა');
  }
}

module.exports = { getComments, addComment, updateComment, deleteComment, featureComment };
