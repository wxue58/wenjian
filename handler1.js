/**
 * Created by guowenqiang on 2016/10/22.
 */
//实现功能接口
var express = require('express'),
    router = express.Router(),
    handler = require('./dbhandler.js'),  // 操作数据库的方法， 处理请求
    formidable = require('formidable'),  // 上传的模块
    crypto = require('crypto');           // 加密
var fs = require('fs');
var ObjectID = require('mongodb').ObjectID;   //处理mongo里面的ID
function User(user) {
  this.id=user.id;
  this.name = user.name;
  this.password = user.password;
  this.veri = user.veri;
};
var flagInt = 0;
//迭代处理删除后的系统管理员各人员的tokenId   -1
var recUpdate = function(req, res, collections,data){ //我要对那个集合进行操作 no.3  我要操作的数据（修改谁？）no.4
	// 什么情况下需要迭代
	if(data.length==0){ //判断我删除的是不是最后一个数据
		res.end('{"success":"删除成功"}')
	}else{  // 迭代处理的操作    tokenId 修改 
		var selector=[
		{"_id":data[0]._id},
		{$set:{
			// 将tokenId -1             // data [{2},{3}]
			"tokenId":data[0].tokenId-1
		}}
		];
		req.query.action='update';
		handler(req,res,collections,selector,function(dat){
			// 执行数据库操作完成  ==》 data[0] 里面的tokenId 已经完成-1 操作  
			console.log(data);
			data.shift();  // data []
			console.log(data);
			if(data.length!=0){
				// 还有要处理的数据
				recUpdate(req,res,collections,data)  // data [{2},{3}]
			}else{
				res.end('{"success":"更新成功"}')
			}
		})	
	}
}
//迭代处理课程列表删除后的ID
var recUpdateID = function(req, res, collections,data,fn){
  if(data.length===0){
    res.end('{"success":"删除成功"}');
  }else{
    var selectors = [
      {"_id":data[0]._id},
      {$set:
      {
        "ID":data[0].ID-1
      }
      }

    ];
    //console.log(fn);
    req.query.action = 'update';
    handler(req, res, collections, selectors,function(dat){
      data.shift();
      if(dat.length==0){
        res.end('{"err":"抱歉，更新失败"}');
      }else if(data.length!=0){
        //console.log(data);
        recUpdateID(req, res, collections,data,fn);
      }else{

        if(fn){
          fn();
        }else{
          res.end('{"success":"更新成功"}');
        }

      }
    });
  }
}
//迭代删除目录绑定的视频
/*
*  dirID:目录_id
*  proID:课程_id
*  VstateName:课程名称
*  data  需要处理的视频数据集
* */
var delDirVideo = function(req, res, dirID,proID,VstateName,data,fn){
  var dirIDProName = dirID+proID ;
  if(data.length===0){
    fn();
  }else{
            req.query.action='find';
            //查询与课程ID对应的目录条数看与该课程绑定的目录是否只剩一条否则不改变videoList的Vstate字段
            handler(req, res, "directoryList", {"CDid":proID},function(set){
              //console.log(set);
              //拆分Vstate去除其中的已删除课程名
              var targetArrVstate = data[0].Vstate.split(",");
              if(set.length===1){
                var indexNumberVstate = (function(arr,val) {
                  for (var i = 0; i < arr.length; i++) {
                    if (arr[i] == val) return i;
                  }
                  return -1;
                })(targetArrVstate,VstateName);
                targetArrVstate.splice(indexNumberVstate,1);
              }
              //拆分Vmosaic去除其中的dirIDProName
              var targetArrVmosaic = data[0].Vmosaic.split(",");
              var indexNumberVmosaic = (function(arr,val) {
                for (var i = 0; i < arr.length; i++) {
                  if (arr[i] == val) return i;
                }
                return -1;
              })(targetArrVmosaic,dirIDProName);
              targetArrVmosaic.splice(indexNumberVmosaic,1);

              var selectors = [
                {"_id":data[0]._id},
                {$set:
                {
                  "Vstate":targetArrVstate.join(","),
                  "Vmosaic":targetArrVmosaic.join(",")
                }
                }

              ];
              //console.log(selectors);
              req.query.action='update';
              //更新视频列表对应数据的Vstate与Vmosaic字段
              handler(req, res, "videoList", selectors,function(da){
                data.shift();
                if(data.length==0){
                  fn();
                }else if(data.length!=0){
                  delDirVideo(req, res, dirID,proID,data,fn);

                }
              });
            });

  }
}
//迭代删除课程绑定的目录
/*
 proID 课程的_id
* */
var delProDir = function(req, res,proID,fn){
    req.query.action = 'find';
  //查询productList，获取对应ID的课程信息的_id和课程名
  handler(req, res, "productList",{_id:proID} ,function(das){
    //获取对应课程_id的目录集directoryList
    handler(req, res, "directoryList",{CDid:proID} ,function(da){
      if(da.length!==0){
        /*
         * /*
         *  dirID:目录_id
         *  proID:课程_id的拼合串
         *  VstateName:课程名称
         *  data  需要处理的视频数据集
         *
         var delDirVideo = function(req, res, dirID,proID,VstateName,data,fn){
         * */
        //获取第一个目录相关的视频集
        handler(req, res, "videoList",{ Vmosaic: { $regex: '.*'+da[0]._id+das[0]._id+'.*' } } ,function(daa){
          delDirVideo(req, res, da[0]._id,das[0]._id,das[0].Cname,daa,function(){
            //删除该目录
            req.query.action = 'delete';
            handler(req, res, "directoryList",{_id:da[0]._id} ,function(dat){
              req.query.action = 'find';
              //再次验证看该课程下是否还有目录，如果有就迭代处理
              handler(req, res, "directoryList",{CDid:proID} ,function(data){
                if(data.length===0){
                  fn();
                }else{
                  delProDir(req, res,proID,fn);
                }
              });
            });
          });

        });

      }else{
        fn();
      }
    });

  });


}
//判断对象是否为空
var isNullObj=function(obj){
  for(var i in obj){
    if(obj.hasOwnProperty(i)){  
    	// 说明对象不为空
      return false;
    }
  }
  return true;  //说明对象是空的
}
//生成课程代码
var generateCode = function(){  // 生成四位随机数字+字母
  var letters = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
  var numbers = ['0','1','2','3','4','5','6','7','8','9'];
  var str = "";   // 容器
  for(var i=0;i<8;i++){
    if(i<4){
      str+= letters.splice(parseInt(Math.random()*(letters.length)),1);
    }else{
      str+= numbers.splice(parseInt(Math.random()*(numbers.length)),1);
    }
  }
  return str;  //str  里面就包含着 随机出来的数字
};
//  配置路由   router --》 这个文件的开头 就已经创建好了
//  /VueHandler/hello?action=XXX
router.get('/hello',function(req,res){
  // 如果我想在一个接口中 根据传递的不同的参数 响应不同的数据
    if(req.query.action==="fcxy"){
      // req.query  从请求头中得到参数
      res.send('{"success":"请求数据成功"}')
    }else {
      res.send('{"err":"没有当前接口"}')
    }
});
// /VueHandler/AdminLoginAndRegHandler?action=verification
// *  适应 编写接口  ==》 js
router.get('/AdminLoginAndRegHandler',function(req,res){
  if(req.query.action==="verification"){
  //   生成四位随机字母+数字
    var randomNum=function(min,max){
      return Math.floor(Math.random()*(max-min));
    };
    var str='ABCDEFGHTMLNOPQRSTUVWXYZ0123456789';
    var returnStr='';
    for(var i=0;i<4;i++){
      var txt=str[randomNum(0,str.length)];
      returnStr+=txt;
    };
    //  生成了随机数字到前台 ---》 后台也要有一个地方储存生成的验证码
    //  后台应该有一个特殊的地方储存 用户的登录信息之验证码 部分
    //  session
    var newUser=new User({
      name:'',
      password:'',
      id:'',
      veri:returnStr   // 生成的验证码
    });
    req.session.user=newUser;
    console.log(req.session);
    res.send('{"success":"成功","data":"'+returnStr+'"}');
  }else if(req.query.action==="checkVerification"){
    if(req.query.veri===req.session.user.veri){
    // 前端发送过来的验证码     后台储存的验证码
    //  ASDAD             ==            CA7T
      res.end('{"success":"验证码正确"}')
    }else {
      res.end('{"err":"验证码输入不正确"}')
    }
  }
});

//  1. 如何得到前端发送的数据 2.添加系统人员信息到数据库 ？？？
//   /VueHandler/AdminLoginAndRegHandler?action=login
router.post('/AdminLoginAndRegHandler',function(req,res){
  if(req.query.action=='login'){  //post req.query.action 我获取到了 url action参数部分
    //  req.query.action=='login' 同时也确定了 数据库的操作方式
    var md5=crypto.createHash('md5');
    var password=md5.update(req.body.password).digest('base64');
    console.log("111111111111");
    //   根据前端发送的数据 对比数据库里面的信息 判断登录
    console.log(req.body.userName);
    console.log(password);
    handler(req,res,"Administor",{userName:req.body.userName,password:password},function(data){
      console.log("111111111111");
      if(data.length===0){
        res.end('{"err":"抱歉，系统里面没有此用户"}')
      }else {
        //   登录功能   把所有的登录信息 保存在 session.user
        req.session.user.name=req.body.userName;
        req.session.user.password=password;
        req.session.user.id=data[0]._id;
        // 此时 服务器 才真正拥有了一个完整的 登录信息
        console.log(req.session);
        // 目标 掌握 session 是什么结构 user 是什么样子
        console.log(req.session.user);
        res.end('{"success":"登陆成功"}')
      }
    })
  }else if(req.query.action='add'){ //执行注册功能
    //   1.执行数据库操作首先要确定对于数据库的操作方法
//注意 有请求 就需要有响应  ===> 前端浏览器 会崩溃的
//      res.send(发送 json)
      req.query.action='shanghai';   // 确定我的数据库的操作方法
      handler(req,res,"Administor",null,function(arr){
            var md5=crypto.createHash('md5'); // crypto 加密
      //   组织用户信息  ==> 进一步的处理
        var userInfos={};
        userInfos.tokenId=arr.length+1;// 简单 有规律 方便操作 不会重复
        userInfos.createAt=new Date();
        //  req.body ==> 获取到post方法 放在 body里面发送过来的数据
        userInfos.isdelete=/^fcgl/.test(req.body.turename)?false:true;
       
//     isdelete : false  || true  用来区别 前端传入的姓名里面是否有 fcgl这四个开头字母
      
        userInfos.power=req.body.power;
        userInfos.success="成功";
        userInfos.upDateAt=new Date();
        userInfos.userName=req.body.userName==''?'false':req.body.userName;
        userInfos.turename=req.body.turename==''?'false':req.body.turename;
        userInfos.password=md5.update(req.body.password).digest('base64');
        userInfos.phone=/^1\d{10}$/.test(parseInt(req.body.phone))?req.body.phone:'false';
        userInfos.powerCode=req.body.power=="系统管理员"?1:2;
      //  添加数据库操作
//    handler(req,res,"Administor",{userName:req.body.userName},)
        req.query.action='add';  // 用来定义数据库的操作方式
      //   验证  手机号码  姓名 账号 都不能为空
        if(userInfos.phone!='false'&&userInfos.userName!='false'&&userInfos!='false'){
        //   验证成功之后 才能执行数据库操作
          handler(req,res,"Administor",userInfos,function(data){
            if(data.length==0){
              res.end('{"err":"抱歉注册失败"}')
            }else {
              res.end('{"success":"成功"}')
            }
          })
        }else {
          res.end('{"err":"抱歉，手机、姓名、账号不能为空"}')
        }

      })
    }else {
    res.end('{"err":"抱歉没有此路由"}')
  }
});
//  /VueHandler/AdminHandler?action=quit
router.get('/AdminHandler',function(req,res){
  if(req.query.action==='quit'){
    //console.log()
    if(req.session.user){
      req.session.user={};
    //   先获取验证码  ==》 登录 ==》 退出
    }
    res.end('{"success":"退出成功"}')
  }else if(req.query.action=='show'){ // /VueHandler/AdminHandler?action=show
  	handler(req,res,"Administor",null,function(arr){ //查询数据库里面的所有数据
//	var selector={"tokenId":{$gt:3*(parseInt(req.query.pageStart)-1),$lte:3*parseInt(req.query.pageStart)}} // 0 -arr.length
  		//                        4-3 = 1      pageStart:当前页                                         ,4     1<tokenId<=4  2 3 4
  		//  pageStart:2  我想请求第二页的数据           -2                                                              ， 4-（6-3） === 1   -100<tokenId<=1   1
  		//  一共： 10   每页只能显示 3条数据    ？ 共有几页  4
  		//  1:3   2:3   3:3  4:1        3*2 <    <=3*3   ***    3*(4-1)<   <=12
  		//    {$gt:3*(parseInt(req.query.pageStart)-1),$lte:3*parseInt(req.query.pageStart)}
  	
  	//根据关键字 查询
//var selector={turename:{$regex:'.*'+req.query.searchText+'.*',$options:'i'}}
           //            使用正则  ： ‘.*’ ==>    ‘.*’+芦+‘.*’   $options 不区分大小写
  		
  		//综合    ---》 关键字查询 || 模糊查询  》pageStart
//	var  selector=!req.query.searchText?{tokenId:{$gt:arr.length-(parseInt(req.query.pageStart)*3-3)-3, $lte:arr.length-(parseInt(req.query.pageStart)*3-3)}}:{turename:{$regex:'.*'+req.query.searchText+'.*',$options:'i'}};
	var selector =!req.query.searchText?{"tokenId":{$gt:3*(parseInt(req.query.pageStart)-1),$lte:3*parseInt(req.query.pageStart)}}:{turename:{$regex:'.*'+req.query.searchText+'.*',$options:'i'}}	
  		handler(req,res,"Administor",selector,function(data){
  			 	console.log(selector)
  			                           //          0<    <=2
  			if(data.length==0){
  				res.end('{"err":"抱歉，系统里面没有该用户"}')
  			}else{
  				var obj={
  					data:{
  						pageSize:3, //每页显示的条数
  						count:arr.length,
  						list:data    //我按照条件查询到的数据
  					}
  				}
  				var str=JSON.stringify(obj);
  				res.end(str);
  			}
  		})
  	})
  }else if(req.query.action=='delete'){  //1.确定接口  2.定义数据库的操作方法
  	handler(req,res,"Administor",{tokenId:parseInt(req.query.tokenId),isdelete:true},function(data){ // 正则 匹配 fcgl ==》isdelete ？ false ：true  
  	//	isdelete:false 无法删除  ===》 fcgl 数据是无法删除的 具有最高权限
  	if(data.result.n==0){  // data 删除的结果集
  		res.end('{"err":"删除失败"}')
  	}else{
  		req.query.action='find';
  		handler(req,res,"Administor",{tokenId:{$gt:parseInt(req.query.tokenId)}},function(da){ 
  			// da 就是查询到的 删除的Id 之后的数据
  			// da  ==> 就是我获取的  >当前删除的数据的 结合的结果    假设 tokenId =1，da={2,3}
  			recUpdate(req,res,"Administor",da);  // 1.2 ， 操作的操作 ，要迭代数据 的方法
  		});
  		res.end('{"success":"删除成功"}')
  	}
  	})
  }
});

//登录的个人信息
// /VueHandler/AdminHandler?action=returnuserinfo
router.post('/AdminHandler',function(req,res){
  if(req.query.action==='returnuserinfo'){
    // 已经登录了  session 里面 已经记录了登陆的账号信息
    // 从 session 里面取到 id的值
    //到数据库里面去查找数据
    var sessionId=new ObjectID(req.session.user.id);//传入的ID值格式和mongo _id一样
    req.query.action='find';
    handler(req,res,"Administor",{"_id":sessionId},function(data){
      if(data.length==0){
        res.end("{'err':'抱歉你没有登录'}")
      }else {   // 1.获取验证码 2.登录 3.获取当前的登录信息
        console.log(data);
        /* data= [{}]
        *
        * */
        var str=JSON.stringify(data[0]);
        res.end(str);
      }
    })
  }else if(req.query.action=='updatepass'){
  //   前端传进密码 ==》 对于数据库来说 （加密）
    var md5=crypto.createHash('md5');
    var passwordMd5=md5.update(req.body.userPwd).digest('base64');
  //   判断 手动输入的原始密码 和 登录的密码 是否一样
    if(req.session.user.password!=passwordMd5){
      res.end('{"err":"输入的登录密码不正确"}')
    }else {
      var md56=crypto.createHash('md5');
      //  服务器 ==》 储存用户的登录信息的地方 --》 密码
      var newPwd=req.session.user.password=md56.update(req.body.newPwd).digest('base64');
    //  对于数据库里面的密码的修改
    //  制作一个 容器 放置的就是 修改的条件 和修改的数据内容
      var selector=[
        {"_id":new ObjectID(req.session.user.id)},
        {$set:{
          "password":newPwd,
          "upDateAt":new Date()
        }}
      ];
      // 定义对于数据库的操作方法===> req.query.action=='updatepass'
      handler(req,res,"Administor",selector,function(data){
        if(data.length==0){
          res.end('{"err":"密码修改失败"}')
        }else {
          res.end('{"success":"密码修改成功"}')
        }
      })
    }
  }else if(req.query.action=="update"){ // 1.接口    2.对于数据库？
//	/VueHandler/AdminHandler?action=update
    var selector=[
    {"tokenId":parseInt(req.body.tokenId)},
    {$set:{
    	"userName":req.body.userName,
    	"turename":req.body.turename,
    	"phone":req.body.phone,
    	"power":req.body.power,
    	"upDateAt":new Date()
    }}
    ];
    console.log(selector)
   handler(req,res,"Administor",selector,function(data){
   	   if(data.length==0){
   	   	res.end('{"err":"抱歉，更新失败"}')
   	   }else{
   	   	res.end('{"success":"更新成功"}')
   	   }
   })
  	
  }else if(req.query.action=='adduser'){
  	
  	// studentList    --》 自动创建
  	/*  tokenId
  	 *  userName
  	 *  phone   使用正则
  	 *  email   
  	 *  createAt
  	 *  isstate
  	 *  upDateAt
  	 *  success
  	 *  userPwd  ==> 后台设置默认密码
  	 * */
  	req.query.action='find';
  	handler(req,res,'studentList',null,function(arr){
  		var userInfors={};
  		userInfors.tokenId=arr.length+1;
  		userInfors.createAt=new Date();
  		userInfors.userName=req.body.userName==""?"false":req.body.userName;
  		userInfors.userPwd='123456';
  		userInfors.isstate=false;
  		userInfors.upDateAt=new Date();
  		userInfors.success='成功';
  		userInfors.phone=/^1\d{10}$/.test(parseInt(req.body.addphone))?req.body.addphone:'false';
  		userInfors.email=/^([a-zA-Z0-9]+[_|\_|\.]?)*[a-zA-Z0-9]+@([a-zA-Z0-9]+[_|\_|\.]?)*[a-zA-Z0-9]+\.[a-zA-Z]{2,3}$/.test(req.body.addemail)?req.body.addemail:"数据格式不对";
  		req.query.action='add'
  		if(userInfors.phone!='false'&&userInfors.userName!='false'&&userInfors.email!="数据格式不对"){
  			handler(req,res,'studentList',userInfors,function(data){
  				if(data.length==0){
  					res.end('{"err":"学员添加失败"}')
  				}else{
  					res.end('{"success":"添加成功"}')
  				}
  			})
  		}else{
  			res.end('{"err":"输入信息不能为空"}')
  		}	
  	})
  }else if(req.query.action=='xxs'){  //10 min
  	req.query.action='find';
  	handler(req,res,'studentMin',null,function(arr){
  		var studentInfors={};
  		studentInfors.tokenId=arr.length+1;
  		studentInfors.createAt=new Date();
  		studentInfors.userName=req.body.userName==""?false:req.body.userName;
  		studentInfors.need="青铜四以上";   // 默认值
  		studentInfors.dsc=req.body.dsc;   // 这个字段可以传空
  		if(studentInfors.userName!="false"){
  			req.query.action="add"
  			handler(req,res,'studentMin',studentInfors,function(data){
  				if(data.length==0){
  					res.end('{"err":"小学生真是太难了"}')
  				}else{
  					res.end('{"success":"你成功的创建了一个小学生"}')
  				}
  			})
  		}else{
  			res.end('{"err":"小学生组织成员姓名不能为空"}')
  		}
  	})
  }
});


// 上传视频 --》 上传
router.post('/UploadVideoHandler',function(req,res){
	// 我现在的这个路由 单独给上传视频使用
	// 上传  ===》 模块    使用的时候 使用表单   ===》 我就可以使用这个来做上传功能
	var from = new formidable.IncomingForm(); 
	// 配置 ==》 限制
	from.encoding='utf-8';
	//关于上传的路径 ===》 以服务器所在的路径为准 app.js
	from.uploadDir='temporary/video/';
    from.keepExtensions=true;
    from.maxFieldsSize=100*1024*1024;
    from.maxFields=1000;
    //后台用来处理文件上传的
    from.parse(req,function(err,fields,files){
    	console.log(fields)   // === > {} 上传时候使用的表单 不止只有上传文件 还可能有其他文本信息，用这个参数获取
    	console.log('界限 第二个参数 ***************************')
    	console.log(files)    // ===> 文件信息
    	console.log('界限 第三个参数 ***************************')
    	console.log(files.hhh.path) ; // 需要前端上传和后台获取 name值 一致
    	console.log(files[Object.getOwnPropertyNames(files)[0]].path)
    	if(!err){
    		// 一系列处理   ==》把上传的文件的路径 返回给前端
    		var obj={
    			cacheName:files[Object.getOwnPropertyNames(files)[0]].path,
    			success:"成功"
    		};
    		var str = JSON.stringify(obj);
    		res.end(str);
    	}else{
    	var obj={
    			err:"上传失败"
    		};
    		var str = JSON.stringify(obj);
    		res.end(str);
    	}
    	
    })
});
router.post('/VideoHandler',function(req,res){
	//  /VueHandler/VideoHandler?action= 
	if(req.query.action=="add"){
		req.query.action="find";  // tokenId
		handler(req,res,'videoList',null,function(arr){
			var videos={};  // 组织校验
			videos.Vname=req.body.Vname; //视频的名字
			videos.Vtime=req.body.Vtime;
			videos.Vurl=req.body.Vurl;
			videos.ID=arr.length+1;   //tokenId
			videos.Vstate='';
			videos.createAt=new Date();
			videos.upDateAt=new Date();
			videos.isFinish=false;
			videos.isViewed=false;
			if(videos.Vname&&videos.Vtime&&videos.Vurl){
				req.query.action='add';
				handler(req,res,'videoList',videos,function(data){
					if(data.length==0){
						res.end('{"err":"抱歉，添加失败"}')
					}else{
						console.log(data);
						var obj={
							ID:parseInt(data.ops[0].ID),
							Vurl:data.ops[0].Vurl,
							// Vurl 定位  ==》 我上传到服务器里面的视频
							success:"成功"
						};
						var str =JSON.stringify(obj);
						res.end(str);
					}
				})
			}
		})
	}else if(req.query.action=='update'){
		// 我现在根据 ID 值进行修改
		req.query.action='find';
		handler(req,res,"videoList",{ID:parseInt(req.body.ID)},function(data){
			if(data.length==0){
				res.end('{"err":"抱歉，系统中无此视频"}')
			}else{
				/* 如果前端发送过来的修改数据 Vurl  保存的就是视频在服务器的路径
				 * Vurl 
				 * */
				if(data[0].Vurl!==req.body.Vurl){  //我要修改url
					// 要该路径  删除源url指向的 视频
					fs.unlink(data[0].Vurl,function(err){
						if(err) return console.log(err);
					})
				}
				var selector=[
				{"ID":parseInt(req.body.ID)},
				{"$set":{
					Vname:req.body.Vname,
					Vtime:req.body.Vtime,
					Vurl:req.body.Vurl,
					upDateAt:new Date()
				}}
				];
				req.query.action="update";
				handler(req,res,"videoList",selector,function(da){
					if(da.length==0){
						res.end('{"err":"更新失败"}')
					}else{
						res.end('{"success":"更新成功"}')
					}
				})
			}
		})
	}else if(req.query.action=='showlist'){ //showlist ： find
				// 查询条件  1. 按页数  2.名字   关键字    
			var selector={};   // pageStart :1     
			if(req.body.searchText){  //如果搜索框里面有数据
				selector.Vname={$regex:'.*'+req.body.searchText+'.*'}
			}
            handler(req,res,"videoList",null,function(arr){
            if(isNullObj(selector)){ //使用 这个方法 判断 selector 是否为空
            	// 如果对象为空   说明 selector的 searchText 是空的
            	//我就可以 按照页数来查询
            selector={ID:{$gt:arr.length-(parseInt(req.body.pageStart)*3-3)-3,$lte:arr.length-(parseInt(req.body.pageStart)*3-3)}}	
            }
//   selector={ 如果有关键字 按照关键字，如果查询条件没有关键字，按照分页来查询 }
             	handler(req,res,"videoList",selector,function(data){
             		if(data.length==0){
             			res.end('{"err":"系统中没有此视频"}')
             		}else{
             			var obj={
             				data:{
             					pageSize:3,
             					count:arr.length,
             					list:data ,  //我应该在当前页显示的数据的内容
             					pageStart:req.body.pageStart
             				},
             				success:"成功"
             			};
             			var str = JSON.stringify(obj);
             			res.end(str);
             		}
             	}) 	
             })
			}
})

/*   删除： ID: ?   手动
 *   但是：  删除的是数据 + 服务器里面的视频
 * */
router.get('/VideoHandler',function(req,res){
	if(req.query.action=='delete'){ 
		// 1.删除服务器里面对应的视频  2.删除集合里面的数据（迭代）
//		1   获取我删除的视频的 Vurl 方便我删除服务器里面的视频  （ 确定我删除的文件 ）
	    req.query.action="find";
	    handler(req,res,"videoList",{ID:parseInt(req.query.ID)},function(data){
	    	if(data.length==0){
	    		res.end('{"err":"系统中找不到视频"}')
	    	}else{
	    		console.log(data);
	    		// 删除服务器里面的视频  Vurl
	    		fs.unlink(data[0].Vurl,function(err){
	    			if(err) return console.log(err);
	    		});
	    		// 视频已经删除掉了，下面需要删除的就是 集合里面的数据了
	    		req.query.action='delete';
	    		handler(req,res,"videoList",{ID:parseInt(req.query.ID)},function(data){
	    			if(data.result.n==0){
	    				res.end('{"err":"删除失败"}')
	    			}else{
	    				// 视频是删除了 但是 ID 值还没有改变呢    迭代 ID-1
	    				// 查询 查询到我要修改的数据(删除的视频的>ID) 有多少
	    				req.query.action='find';
	    				handler(req,res,"videoList",{ID:{$gt:parseInt(req.query.ID)}},function(da){
	    					recUpdateID(req,res,"videoList",da);
	    				});
	    				res.end('{"success":"成功"}')
	    			}
	    		})
	    	}
	    })
	}
})




module.exports = router;
