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

//3. ��������, files�ȿ� m3u8�̶�,.ts���� �����Ȱ� Ȯ���ϰ� �ּ�ó�� 
// ���� �Լ����� ������ص���. 
//4. kill.ejs�� �̵�
