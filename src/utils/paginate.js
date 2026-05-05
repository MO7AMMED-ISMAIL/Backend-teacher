// src/utils/paginate.js
//
// Reusable pagination helper for every list endpoint.
//
// Usage inside any controller:
//
//   const { parsePagination, buildMeta } = require('../utils/paginate');
//   const { page, limit, skip } = parsePagination(req.query);
//
//   const [rows, total] = await Promise.all([
//       Model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
//       Model.countDocuments(filter),
//   ]);
//
//   res.json({
//       success: true,
//       data: rows,
//       pagination: buildMeta({ page, limit, total }),
//   });

const parsePagination = (query = {}, { defaultLimit = 10, maxLimit = 100 } = {}) => {
    const page  = Math.max(1, parseInt(query.page,  10) || 1);
    let limit   = parseInt(query.limit, 10) || defaultLimit;
    limit       = Math.min(Math.max(limit, 1), maxLimit);
    const skip  = (page - 1) * limit;
    return { page, limit, skip };
};

const buildMeta = ({ page, limit, total }) => ({
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
});

module.exports = { parsePagination, buildMeta };
