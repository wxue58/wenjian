var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.send("你好，这是我的默认页面");
});

module.exports = router;
