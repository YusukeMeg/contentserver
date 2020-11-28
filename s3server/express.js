var express = require('express');
var app = express();
var crypto = require('crypto')
var sqlite3 = require('sqlite3').verbose()

var s3proxy = (path,filename)=>{
  if(path.split('/').pop()){
    filename = filename || path.split('/').pop();
  }else{
    filename = "filelist.xml"
  }
  const access_key_id = "demo:demo";
  const secret_access_key = "DEMO_PASS";

  const date_string = (new Date()).toUTCString();
  const sign_base =  ["GET", "", "", date_string, "" + path].join("\n")

  const hmac = crypto.createHmac('sha1', secret_access_key)
  hmac.update(sign_base)
  const auth_token_base64 =  hmac.digest('base64');
  return({    
    'X-Accel-Redirect': `/s3redirect${path}`,
    'X-S3Auth-Header': "AWS " + access_key_id + ":" + auth_token_base64,
    'X-S3Date-Header': date_string,
    'X-S3File-Name': filename
  });

}

app.get('/video/:id', function(req, res) {
  const bucket_name = "/bucket/";
  const object_path = req.params.id || "";

  res.set(s3proxy(`${bucket_name}${object_path}`));

  res.send('Hello World!');
});
app.get('/list', function(req, res) {
  const bucket_name = "/bucket/";
  res.set(s3proxy(`${bucket_name}`));
  res.send('Hello World!');
});

app.get('/meta', function(req, res) {
  const db = new sqlite3.Database('./db/videolist.db');
  db.serialize(function() {
    db.all('SELECT id, name, quality, title, length, thumnale FROM videos', function(err, rows) {
        res.json(rows);
    });
  });
  db.close();
});

app.get('/video/upsert/:name', async function(req, res) {
  const db = new sqlite3.Database('./db/videolist.db');
  const name = req.params.name;
  const quality = name.match(/[^_](\d{2,4})P/)[0];

  db.serialize(async function () {
    
    db.get(`SELECT id, name, quality, title, length, thumnale FROM videos where name='${name}.mp4'`,
      function(err, rows) {
        if(rows){
          res.json(rows);
        }else{
          var stmt = db.prepare('INSERT INTO videos (name, quality, title, length, thumnale ) VALUES (?,?,?,?,?)')
  
          // for (var i = 0; i < 10; i++) {
          stmt.run(`${name}.mp4`,quality,name,0,`thums/${name}.jpg`)
          // }
        
          stmt.finalize();
          res.json({status:"success",name:`${name}.mp4`});
        }
        db.close()
    })
    // CREATE TABLE videos(id integer primary key autoincrement not null, name text, quality text, title text,length integer , thumnale text);
  })
});

app.get('/video/delete/:name', async function(req, res) {
  const db = new sqlite3.Database('./db/videolist.db');
  const name = req.params.name;

  db.serialize(async function () {
    
    db.get(`delete FROM videos where id='${name}'`,
      function(err, rows) {
        res.json({status:"ok"});
        
        db.close()
    })
    // CREATE TABLE videos(id integer primary key autoincrement not null, name text, quality text, title text,length integer , thumnale text);
  })
});




// date_string = Time.now.utc.to_s(:rfc822)
//     sign_base = ["GET", "", "", date_string, "" + access_path].join("\n")
//     auth_token = OpenSSL::HMAC::digest(OpenSSL::Digest::SHA1.new, secret_access_key, sign_base)
//     auth_token_base64 = Base64.encode64(auth_token).strip()

//     # S3上のパスの先頭に/s3redirectを付加してX-Accel-Redirect
//     response.headers['X-Accel-Redirect'] = "/s3redirect" + access_path
//     response.headers['X-S3Auth-Header']  = "AWS " + access_key_id + ":" + auth_token_base64
//     response.headers['X-S3Date-Header']  = date_string
//     response.headers['X-S3File-Name']    = file_name
app.listen(3000, function() {
  console.log('Example app listening on port 3000!');
});