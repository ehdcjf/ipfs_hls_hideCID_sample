//

const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller =  require('@ffmpeg-installer/ffmpeg');
const fs = require('fs');
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

//
ffmpeg(`files/Dan Farber - Don't Touch.mp4`,{timeout:432000}).addOptions([
    '-profile:v baseline',
    '-level 3.0',
    '-start_number 1000000000',
    '-hls_time 10',
    '-hls_list_size 0',
    '-f hls'
]).output(`files/Dan Farber - Don't Touch.m3u8`).on('end',()=>{
    console.log('end');
}).run();

//3. 끝났으면, files안에 m3u8이랑,.ts파일 생성된거 확인하고 주석처리 
// 따라 함수만들어서 라우팅해도됨. 
//4. kill.ejs로 이동
