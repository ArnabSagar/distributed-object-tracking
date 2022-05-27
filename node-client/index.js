const SCHEDULER_URL = new URL('https://scheduler.distributed.computer');
const fs = require("fs");
const ffmpeg = require('ffmpeg');
const getPixels = require("get-pixels")
var savePixels = require("save-pixels")
const { spawn } = require('child_process');


function convertFrameToPixels(myBuffer){ 

    let someConst;
    getPixels(myBuffer, "image/jpeg", function(err, pixels){
        if (err){        
            // return err;
            throw err;
        } else {
            someConst = pixels          
        }
    });
    return someConst;

}


async function getPixelData(path){

    var myBuffer = fs.readFileSync(`${path}`);
    var framePixelData = await convertFrameToPixels(myBuffer)
    return framePixelData

}


function createVideo(pathToFrames){

    const ls = spawn('ffmpeg', ['-i', `${pathToFrames}/output_%d.jpg`, '-vcodec', 'mpeg4', 'final.mp4']);
    
    ls.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });
    
    ls.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });
    
    ls.on('close', (code) => {
      console.log(`child process exited with code ${code}`);
    });
    
}




function createFrames(pathToVideo){

    return new Promise((resolve,reject)=>{
        try {
            var process = new ffmpeg(pathToVideo);
            process.then(function (video) {
                video.fnExtractFrameToJPG('./frames', {
                    every_n_frames : 1,
                    file_name : `%s_frame`
                }, function (error, files) {
                    if (!error){
                        console.log('Frames saved');
                        resolve()
                    }
                    else{
                        console.log('Error! Frames not saved.\n' + error);
                        reject()
                    }
                });
            }, function (err) {
                console.log('Error: ' + err);
                reject()
            });
        } catch (e) {
            console.log(e.code);
            console.log(e.msg);
            reject()
        }
 
    });

}

function workFunction(pixelData){
    
    // progress();
    
    for(var i = 0; i<pixelData.length; i=i+4){

        /** For Grayscale */
        var total = (pixelData[i] + pixelData[i+1] + pixelData[i+2])/3
        pixelData[i] = total
        pixelData[i+1] = total
        pixelData[i+2] = total

        /** For contrast (2) and brightness (50) */
        // pixelData[i] =  (2*pixelData[i]) + 50;
 
    }

    return pixelData
}


async function main(){    

    let pathToVideo = "testvid1.mp4"
    let pathToFrames = "./frames"
    let pathToConvertedFrames = "./outputSet"
    let framesObjects = [];         
    let framesPixelsArray = []

    /* INPUT SET */  
    await createFrames(pathToVideo)                 //Split the video into frames

    let frames = fs.readdirSync(pathToFrames)       //Read list of frames and sort them in ascending order
    frames.sort(function(a, b){
        return a.length - b.length;
    });

    for(const frame of frames){                     //Taking each frame in the list and converting the frame to pixel data buffer object.
        let pixelData = await getPixelData(`${pathToFrames}/${frame}`)
        framesObjects.push(pixelData)    
    }

    framesObjects.forEach(element => {              //Adding only the Uint8 pixel data of frames to a list from the object  
        framesPixelsArray.push(new Uint8Array(element.data))
    });

    // framesPixelsArray.forEach(element => {
    //     console.log(element);
    // });


    /*DCP COMPUTE*/ 
    // const compute = require('dcp/compute');
    // const job = compute.for(framesPixelsArray, workFunction); 

    // job.on('accepted', () => {
    //     console.log(` - Job accepted by scheduler, waiting for results`);
    //     console.log(` - Job has id ${job.id}`);
    //     startTime = Date.now();
    // });

    // job.on('readystatechange', (arg) => {
    //     console.log(`new ready state: ${arg}`);
    // });

    // job.on('result', (ev) => {
    //     console.log(
    //         ` - Received result for slice ${ev.sliceNumber} at ${Math.round((Date.now() - startTime) / 100) / 10
    //         }s`,
    //     );
    // });
  
    // job.public.name = 'Arnab\'s intern project, nodejs ';

    // let resultSet = await job.localExec(); //for executing the job locally OR
    // let resultSet = await job.exec(0.001); //for executing the job on DCP
    
    // // /* PROCESSING OF RESULTS */ 
    // resultSet = Array.from(resultSet);
    // console.log(resultSet);
    // let counter1 = 0
    // resultSet.forEach(function (frame) {
    //     framesObjects[counter1].data = Array.from(frame)
    //     counter1++;
    // });
    // console.log(framesObjects);

    // console.log("New pixels data after the work function:");
    // framesObjects.forEach(element => {
    //     console.log(new Uint8Array(element.data) );
    // });

    /* SOLUTION FOR NON-DCP RESULTS*/
    for (let frame of framesPixelsArray) {
        frame = workFunction(frame);
    }
    for (var i = 0; i < framesObjects.length; i++) {    //Copying resulting pixel data of frames back to the list of object data of frames
        framesObjects[i].data = framesPixelsArray[i];
    }

    
    /* SAVING CONVERTED FRAMES' OBJECTS TO FRAMES' IMAGES */
    let counter = 0;    
    for(const frame of framesObjects){      //Loop to save each frame's object data as an image
        counter++;
        // console.log(frame);
        let bufferOut = await savePixels(frame, 'jpg'); // ndarray -> Uint8Array
        fs.writeFileSync(`./outputSet/output_${counter}.jpg`, bufferOut._obj);
    }


    /* Stiching resulting frames to a video */
    createVideo(pathToConvertedFrames);

}

// /* Initialize DCP Client and run main() */
require('dcp-client')
  .init(SCHEDULER_URL)
  .then(main)
  .catch(console.error)
  .finally(process.exit);
