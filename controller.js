const aws = require('aws-sdk');
const dotenv = require('dotenv');

require('dotenv').config();

aws.config.region = 'us-east-2';

//= ====== First Run Setup Tables (outdated 10/12) ======
const firstrun = (req, res) => {
  console.log('this function is out of date.');
  // const db = req.app.get('db');
  // db.createTables().then(response => res.redirect('/'));
};

// ========== For Comments =======

// ========= Admin-only Routes =======
const addLocation = (req, res) => {
  const db = req.app.get('db');
  const {
    id, name, latitude, longitude, floorplan, district, active, allowedUsers
  } = req.body;
  console.log(allowedUsers);
  const permissions = allowedUsers.map(user => ({ userid: user, location: id }));
  console.log('add location permissions', permissions);
  db
    .addLocation({
      id,
      name,
      latitude,
      longitude,
      floorplan,
      district,
      active
    })
    .then(() => db.location_permissions.insert(permissions))
    .then(response => res.send(response));
};

const getUsers = (req, res) => {
  const db = req.app.get('db');
  db.getUsers().then(response => res.json(response));
};

//= =======Location routes =========
const getLocations = (req, res) => {
  console.log('get locations', req.user);
  const db = req.app.get('db');
  db.getLocations(req.user.username).then(response => res.send(response));
};

// ==============Comments Routes ======

// == GET LOCATION (INCLUDING COMMENTS, TAGS, REPLIES)
const getLocation = (req, res) => {
  const db = req.app.get('db');
  db.getLocation(req.params.id).then(response => res.send(response));
};

const getComments = (req, res) => {
  const db = req.app.get('db');
  db.getComments(req.params.id).then((response) => {
    console.log('getcomments', response);
    return res.send(response);
  });
};

const getTags = (req, res) => {
  const db = req.app.get('db');
  console.log('get tags:', req.body);
  db.getTags(req.body.id).then(response => res.json(response));
};

const getReplies = (req, res) => {
  const db = req.app.get('db');
  db.getReplies(req.params.id).then(response => res.json(response));
};

// ADD/UPDATE/DELETE COMMENTS (INCLUDING NEW TAGS)
const getTagTemplate = (req, res) => {
  const db = req.app.get('db');
  console.log('get tag template:', req.params.id);
  db.getTags(req.params.id).then(response => res.json(response));
};

const addComment = (req, res) => {
  const db = req.app.get('db');
  const { newComment } = req.body;
  db
    .addComment([
      newComment.content,
      newComment.author,
      newComment.location,
      newComment.x,
      newComment.y,
      newComment.imagePath
    ])
    .then(response => res.json(response));
};

const addTags = (req, res) => {
  const db = req.app.get('db');
  const tags = req.body.tags.map(tag => ({
    title: tag.title,
    category: tag.category,
    subcategory: tag.subcategory,
    comment_id: req.body.comment
  }));
  console.log('add tags', tags);
  // There shouldn't be any existing tags for a comment except for the TEMPLATE comment.
  // IF there are, that's ok, because we are deleting them and then reposting the updated ones.

  db.clearTags(tags[0].comment_id).then((response) => {
    db.tags.insert(tags).then(response => res.json(response));
  });
};
const updateComment = (req, res) => {
  const db = req.app.get('db');
  db.updateComment(req.params.id).then(response => res.json(response));
};

const addReply = (req, res) => {
  const db = req.app.get('db');
  db
    .addReply({
      content: req.body.replyText,
      comment_id: req.params.id,
      author: req.user.username
    })
    .then(response => res.json(response));
};

const deleteComment = (req, res) => {
  const db = req.app.get('db');
  db.deleteComment([req.params.id]).then(response => res.json(response));
};

//= ========= Analytics routes ===========
const getAnalytics = (req, res) => {
  const db = req.app.get('db');
  if (req.query.q === 'time') {
    if (req.query.for === 'locations') {
      db.analytics.getTimeDataForLocations().then(response => res.json(response));
    } else if (req.query.for === 'tags') {
      db.analytics.getTimeDataForTags().then(response => res.json(response));
    }
  } else if (req.query.q === 'tags') {
    db.analytics.getTagBreakdownByLocation().then(response => res.json(response));
  }
};

const getCommentsData = (req, res) => {
  const db = req.app.get('db');
  db.analytics.getCommentCount().then(response => res.json(response));
};

const getTimeDetailForLocation = (req, res) => {
  const db = req.app.get('db');
  console.log(req.params);
  db.analytics.getTimeDetailForLocation(req.params).then(response => res.json(response));
};

const getCommentsByTag = (req, res) => {
  const db = req.app.get('db');
  db.analytics.getCommentsByTag(req.query).then(response => res.json(response));
};

//= ======S3========//
const signS3 = (req, res) => {
  const { S3_BUCKET } = process.env;
  const s3 = new aws.S3();
  const fileName = req.query['file-name'];
  const fileType = req.query['file-type'];

  const s3Params = {
    Bucket: S3_BUCKET,
    Key: fileName,
    Expires: 60,
    ContentType: fileType,
    ACL: 'public-read'
  };

  s3.getSignedUrl('putObject', s3Params, (err, data) => {
    if (err) {
      console.log('get signed url err ', err);
      return res.end();
    }
    const returnData = {
      signedRequest: data,
      url: `https://${S3_BUCKET}.s3.amazonaws.com/${fileName}`
    };

    res.write(JSON.stringify(returnData));
    res.end();
  });
};

module.exports = {
  signS3,
  getLocations,
  getLocation,
  addLocation,
  getComments,
  addComment,
  deleteComment,
  firstrun,
  getUsers,
  addTags,
  getTags,
  getTagTemplate,
  getAnalytics,
  getCommentsData,
  updateComment,
  addReply,
  getReplies,
  getTimeDetailForLocation,
  getCommentsByTag
};
