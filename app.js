const express = require('express');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
const path = require('path');
const hls = require('hls-server');
const { create, globSource } = require('ipfs-http-client');
const axios = require('axios');
const { render } = require('express/lib/response');
const ipfs = create("http://3.34.161.155:5001");
const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: '/tmp/'
}));

app.get('/', (req, res) => {
    res.render('home');
});

app.get('/list',async(req,res)=>{
    const manifests = JSON.parse(await readFile('./title.json')).title;
    res.render('list',{manifests})
})

app.get('/video',async(req,res)=>{
    const manifest = req.query.src;
    res.render('video',{manifest})
})

app.post('/upload', async (req, res) => {
    const name = req.body.name;
    const file = req.files.file
    
    console.log('download from client')
    ///==== download mp4
    const tempDir = path.join(__dirname, `files/${name}`)
    if (fs.existsSync(tempDir)) {
        return res.send({ error: true, message: 'filename already exist, try changename to unique' })
    }

    fs.mkdirSync(tempDir, { recursive: true });
    const fileName = name + '.' + file.mimetype.split('/').pop();
    const filePath = tempDir + '/' + fileName;
    await file.mv(filePath, async (err) => {
        if (err) {
            console.log(`Error:failed to download the file`);
            return res.status(500).send(err);
        }
    })

    console.log('convert Start')
    ///=== mp4 -> m3u8 convert;
    await ffmpegSync(filePath, tempDir, name)

    console.log('convert Done');

    ///===delete orign mp4 
    fs.unlink(filePath, (err) => {
        if (err) console.log(err)
        else console.log('delete mp4')
    })

    // import DB
    let db = JSON.parse(await readFile("./db.json"));
    let title = JSON.parse(await readFile("./title.json"));

    // upload ipfs
    console.log('upload m3u8 & .ts to IPFS');
    for await (const file of ipfs.addAll(globSource(tempDir, '*'))) {
        db[`${file.path}`] = `${file.cid}`
        console.log(`"${file.path}" : "${file.cid}"`);
        if(file.path.split('.').pop()=='m3u8'){
            title.title.push(`${file.path}`)
        }
    }
    console.log('upload Done')

    // update DB
    await writeFile("./db.json",db);
    await writeFile("./title.json",title);
    console.log("update DB")

    //delete dir 
    fs.rm(tempDir, { recursive: true }, (err) => {
        if (err) console.log(err)
        console.log('clear, folder KILL')
    })
    res.redirect('list');
})


const ffmpegSync = async (filePath, tempDir, name) => {
    return new Promise((resolve, reject) => {
        ffmpeg(filePath, { timeout: 432000 }).addOptions([
            '-profile:v baseline',
            '-level 3.0',
            '-start_number 1000000000',
            '-hls_time 10',
            '-hls_list_size 0',
            '-f hls'
        ]).output(tempDir + '/' + name + '.m3u8')
            .on('end', () => {
                console.log('File Convert Success!')
                resolve();
            })
            .on('error', (err) => {
                return reject(new Error(err))
            }).run()
    })
}


async function readFile(path) {
    return new Promise((resolve, reject) => {
      fs.readFile(path, 'utf8', function (err, data) {
        if (err) {
          reject(err);
        }
        resolve(data);
      });
    });
  }

async function writeFile(path,data) {
    return new Promise((resolve, reject) => {
      fs.writeFile(path, JSON.stringify(data), function (err) {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });
  }


const PORT = 3000
const server = app.listen(PORT, () => {
    console.log(`server is listening on port ${PORT}`);
})

new hls(server, {
    provider: {
        exists: (req, cb) => {
            console.log(req.url)
            const ext = req.url.split('.').pop();
            if (ext !== 'm3u8' && ext !== 'ts') {
                return cb(null, true);
            }
            return cb(null, true);

            // fs.access(__dirname + req.url, fs.constants.F_OK,function(err){
            //     if(err){
            //         console.log('File not exist');
            //         return cb(null,false);
            //     }
            //     cb(null,true);
            // });
        },
        getManifestStream: async (req, cb) => {
            console.log(req.url)
            const db = JSON.parse(await readFile("./db.json"));
            const target = req.url.split('/').pop().replaceAll('%20', ' ');
            const fileUrl = `http://3.34.161.155:8080/ipfs/${db[target]}`

            const xtream = await axios({
                method: 'GET',
                url: fileUrl,
                responseType: 'stream',
            });
            cb(null, xtream.data);
        },
        getSegmentStream: async (req, cb) => {
            console.log(req.url)
            const db = JSON.parse(await readFile("./db.json"));
            const target = req.url.split('/').pop().replaceAll('%20', ' ');
            const fileUrl = `http://3.34.161.155:8080/ipfs/${db[target]}`
            const xtream = await axios({
                method: 'GET',
                url: fileUrl,
                responseType: 'stream',
            });
            cb(null, xtream.data);
        }
    }
})




  // app.post('/upload', async (req, res) => {
//     const name = req.body.name

//     const files = req.files.file;
//     const fileTitle = files[0].name.split('.')[0];
//     const tempDir = path.join(__dirname,`files/${fileTitle}`)
//     if(fs.existsSync(tempDir)){
//         return res.send({ error: true, message: 'filename already exist, try changename to unique' })
//     }

//     fs.mkdirSync(tempDir,{recursive:true});

//     for (let i = 0; i < files.length; i++) {
//         const file = files[i];
//         const fileName = file.name;
//         const filePath = tempDir + '/' + fileName;
//         await file.mv(filePath, async (err) => {
//             if (err) {
//                 console.log(`Error:failed to download the file`);
//                 return res.status(500).send(err);
//             }
//         })
//     }

//     for await (const file of ipfs.addAll(globSource(tempDir, '*'))) {
//         console.log(`"${file.path}": "${file.cid}" `)
//     }

//     fs.rm(tempDir,{recursive: true}, (err)=>{
//         if(err)console.log(err)
//         console.log('clear')
//     })


// });


// const addFile = async (fileName, filePath) => {
//     const file = fs.readFileSync(filePath);
//     const fileAdded = await ipfs.add({ path: fileName, content: file });
//     console.log(fileAdded)
//     const fileHash = fileAdded.cid;
//     return fileHash;
// }