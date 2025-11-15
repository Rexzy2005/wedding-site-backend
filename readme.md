# API Documentation

Complete API reference for the Cloudinary Media Backend.

## Base URL
```
http://localhost:5000
```

## Authentication

Admin routes require Bearer token in Authorization header:
```
Authorization: Bearer YOUR_TOKEN_HERE
```

Get token by logging in at `/admin/login`.

---

## Admin Authentication

### Login
```
POST /admin/login
```

**Body:**
```json
{
  "password": "your_admin_password"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "abc123def456..."
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid password"
}
```

---

### Logout
```
POST /admin/logout
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

## Media Endpoints

### 1. Upload Media (Admin Only)
```
POST /media/upload
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
Content-Type: multipart/form-data
```

**Form Data:**
- `files`: Multiple files (images/videos) - Required
- `caption`: Optional caption for all uploaded files - Optional

**Success Response (201):**
```json
{
  "success": true,
  "message": "Successfully uploaded 3 file(s)",
  "uploaded": 3,
  "failed": 0,
  "media": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "url": "https://res.cloudinary.com/...",
      "publicId": "media-uploads/abc123",
      "type": "image",
      "caption": "Beautiful sunset at the beach",
      "createdAt": "2024-11-15T00:00:00.000Z"
    }
  ]
}
```

---

### 2. Get All Media (Public)
```
GET /media
```

**Query Parameters:**
- `type` (optional): Filter by type (`image` or `video`)
- `search` (optional): Search by caption (case-insensitive)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Examples:**
```
GET /media
GET /media?type=image
GET /media?search=sunset
GET /media?type=video&search=beach
GET /media?page=2&limit=10
GET /media?type=image&page=1&limit=50
```

**Success Response (200):**
```json
{
  "success": true,
  "count": 20,
  "total": 150,
  "page": 1,
  "totalPages": 8,
  "hasNextPage": true,
  "hasPrevPage": false,
  "media": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "url": "https://res.cloudinary.com/...",
      "publicId": "media-uploads/abc123",
      "type": "image",
      "caption": "Beautiful sunset at the beach",
      "createdAt": "2024-11-15T00:00:00.000Z"
    }
  ]
}
```

**Response Fields:**
- `count` - Number of items in current page
- `total` - Total number of items matching filter
- `page` - Current page number
- `totalPages` - Total number of pages
- `hasNextPage` - Boolean indicating if there's a next page
- `hasPrevPage` - Boolean indicating if there's a previous page
- `media` - Array of media items

---

### 3. Get Single Media (Public)
```
GET /media/:id
```

**Success Response (200):**
```json
{
  "success": true,
  "media": {
    "_id": "507f1f77bcf86cd799439011",
    "url": "https://res.cloudinary.com/...",
    "publicId": "media-uploads/abc123",
    "type": "image",
    "caption": "Amazing view from the mountain top",
    "createdAt": "2024-11-15T00:00:00.000Z"
  }
}
```

---

### 4. Update Media Caption (Admin Only)
```
PATCH /media/:id/caption
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
```

**Body:**
```json
{
  "caption": "Updated caption text"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Caption updated successfully",
  "media": {
    "_id": "507f1f77bcf86cd799439011",
    "url": "https://res.cloudinary.com/...",
    "publicId": "media-uploads/abc123",
    "type": "image",
    "caption": "Updated caption text",
    "createdAt": "2024-11-15T00:00:00.000Z"
  }
}
```

---

### 5. Delete Media (Admin Only)
```
DELETE /media/:id
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Media deleted successfully"
}
```

---

### 6. Download All Media as ZIP (Admin Only)
```
GET /media/download/zip
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Query Parameters:**
- `type` (optional): Filter by type (`image` or `video`)

**Examples:**
```
GET /media/download/zip
GET /media/download/zip?type=image
GET /media/download/zip?type=video
```

**Response:**
- Streams a ZIP file containing all media
- Filename format: `media-YYYY-MM-DDTHH-MM-SS.zip`
- Uses streaming (no buffering)
- Files retain original names with extensions

**Note:** This endpoint is ADMIN ONLY. Regular users download files individually using direct Cloudinary URLs.

---

## Downloading Media

### Individual Downloads (Public Users)

Users download files individually using the direct Cloudinary URLs from the media object:

```javascript
// Get media
const response = await fetch('/media?page=1&limit=50');
const { media } = await response.json();

// Trigger download for each file
media.forEach(item => {
  const link = document.createElement('a');
  link.href = item.url;
  link.download = true;
  link.click();
});
```

### Pagination Example

```javascript
// Fetch first page
let page = 1;
const limit = 20;

async function loadMoreMedia() {
  const response = await fetch(`/media?page=${page}&limit=${limit}`);
  const data = await response.json();
  
  // Display media
  displayMedia(data.media);
  
  // Check if more pages available
  if (data.hasNextPage) {
    page++;
    // Show "Load More" button
  }
}
```

**Note:** Backend does NOT create ZIP files for public users. Users download multiple files individually using the Cloudinary URLs. Only admins can download as ZIP.

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description here"
}
```

**Common Status Codes:**
- `400` - Bad Request (validation errors, missing fields)
- `401` - Unauthorized (missing/invalid token)
- `404` - Not Found (resource doesn't exist, invalid route)
- `500` - Internal Server Error

---

## Rate Limits

Currently no rate limiting implemented. Consider adding rate limiting for production use.

---

## CORS

CORS is enabled for all origins. Configure in production to restrict to your frontend domain.

---

## Notes

- All timestamps are in ISO 8601 format
- File URLs are permanent Cloudinary CDN links
- Public endpoints use `.lean()` for optimized performance
- Admin token stored in-memory (resets on server restart)
- Maximum 20 files per upload request