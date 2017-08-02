
var express = require('express');  //引入 express
var path = require('path');   //引入 模块 path    路径优化 =--》使用
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session=require('express-session');
var index = require('./routes/index');   // 定义了一个变量， 引入的index
var handler = require('./routes/handler1');  // 定义了一个变量， 引入的users
var flash=require('connect-flash');
var url=require('url');
var app = express();       // 创建一个服务器
app.use(logger('dev'));  //使用日志
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
// 解析 body   --》 使用 app.use（）  ，明天
app.use(cookieParser());    // session  --> 用户信息----》 登录功能
app.use(flash());  // 先 cookiePars后 flasher
app.all('*', function(req, res, next) {
// app.all  所有请求过来的时候 都使用我这里面的 function
//    function  --> 处理跨域
//    处理跨域  --》 只需要设置请求头  ，其他去要的部分 都在底层处理完毕
//    以后 工作  -》
//     项目里面 不涉及
    var oriRefer;
    if(req.headers.referer){
        oriRefer= req.headers.referer.substring(0,req.headers.referer.indexOf("/",10));
    }
    var MIME_TYPE = {
        "css": "text/css",
        "gif": "image/gif",
        "html": "text/html",
        "ico": "image/x-icon",
        "jpeg": "image/jpeg",
        "jpg": "image/jpeg",
        "js": "text/javascript",
        "json": "application/json",
        "pdf": "application/pdf",
        "png": "image/png",
        "svg": "image/svg+xml",
        "swf": "application/x-shockwave-flash",
        "tiff": "image/tiff",
        "txt": "text/plain",
        "wav": "audio/x-wav",
        "wma": "audio/x-ms-wma",
        "wmv": "video/x-ms-wmv",
        "xml": "text/xml"
    };
    var filePath;
    if(req.url==="/"){
        filePath =  "index.html";
    } else if(req.url==="/www/"){
        filePath =  "index.html";
    }else{
        filePath = "./" + url.parse(req.url).pathname;
    }
    var ext = path.extname(filePath);
    ext = ext?ext.slice(1) : 'unknown';
    var contentType = MIME_TYPE[ext] || "text/plain";
    res.header("Access-Control-Allow-Origin", oriRefer?oriRefer:"*");
    res.header('Access-Control-Allow-Credentials', true);
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By",' 3.2.1')
    res.header("Content-Type", contentType+";charset=utf-8");
    next();
});
// 用户
app.use(session({
    secret:'FCXYHT',               //设置 session 签名
    name:'FCXYHT',
    cookie:{maxAge:80000000000}, // 储存的时间
    resave:false,             // 每次请求都重新设置session
    saveUninitialized:true   //
}));
// 验证用户登录
app.use(function(req, res, next){
    res.locals.user = req.session.user;
    var error = req.flash('error');  //  登录
    res.locals.error = error.length ? error : null;
    var success = req.flash('success');
    res.locals.success = success.length ? success : null;
    next();
});

app.use('/', index);    //  lochost:3000   ---> 加载 index（已经配置好的路由文件）
app.use('/VueHandler',handler);  // handler 路由文件 业务逻辑

app.get('/DownLoadPicHandler',function(request,response){
    // localhost:8000/DownLoadPicHandler
    // 图书图片的处理
    var arr = request.originalUrl.split("="); // 接口   get  /? asdjaisd=asndiasidja
    console.log(arr);
    var host="localhost";
    var port="27017";
    var server=new mongo.Server(host,port,{auto_reconnect:true});//创建数据库所在的服务器服务器
    var db=new mongo.Db("administor",server,{safe:true});//创建数据库对象
    db.open(function (err,db) {//连接数据库
        if(err)
            console.log(err);
        else{
            db.collection('coverList', function (err,collection) {
                if (err){  response.end('{"err":"抱歉，上传图片失败"}');}
                else {
                    collection.find({pathName:arr[arr.length-1]}).toArray(function (err, docs) {

                        if (err||!docs[0]){

                            console.log('234566');
                            response.end('{"err":"抱歉，上传图片失败"}');
                        }
                        else {
                            db.close();
                            response.end(docs[0].contents.buffer);
                        }
                    });
                }
            });
        }
    });
    db.on("close", function (err,db) {//关闭数据库
        if(err) throw err;
        else console.log("成功关闭数据库.");
    });

});

app.use(express.static(path.join(__dirname, 'public')));
app.listen(8000);     //  node app.js       err node ./bin/www   ||  npm start
//module.exports = app;