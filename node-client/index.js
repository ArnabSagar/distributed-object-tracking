const SCHEDULER_URL = new URL("https://scheduler.distributed.computer");
const fs = require("fs");
const ffmpeg = require('ffmpeg');
const getPixels = require("get-pixels");
var savePixels = require("save-pixels");
// const { spawn } = require('child_process');

function convertFrameToPixels(myBuffer) {
  let someConst;
  getPixels(myBuffer, "image/jpeg", function (err, pixels) {
    if (err) {
      // return err;
      throw err;
    } else {
      someConst = pixels;
    }
  });
  return someConst;
}

async function getPixelData(path) {
  var myBuffer = fs.readFileSync(`${path}`);
  var framePixelData = await convertFrameToPixels(myBuffer);
  return framePixelData;
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

function workFunction(pixelData) {
  progress();

  for (var i = 0; i < pixelData.length; i = i + 4) {
    /** For Grayscale */
    var total = (pixelData[i] + pixelData[i + 1] + pixelData[i + 2]) / 3;
    pixelData[i] = total;
    pixelData[i + 1] = total;
    pixelData[i + 2] = total;

    /** For contrast (2) and brightness (50) */
    // pixelData[i] =  (2*pixelData[i]) + 50;
  }

  return pixelData;
}

async function work(thisImage) 
{
  let depthMap = thisImage[0];
  thisImage = thisImage[1];
  try 
  {
    const tf = require("tfjs");
    const ais = require('aisfastquant');
    progress(0);
    // console.log("here1");
    let myTimer = setInterval(function()
    {
      progress();
    }, 1000);
    // console.log("here2");
    let myPath = 'https://aisight.ca/prestriate/quantized/model.json';
    let myData = ais.urlMap[myPath];
    let myString = await atob(myData);
    let myObject = await JSON.parse(myString);
    let myFiles = [];
    let myLength = myObject.weightsManifest[0].paths.length;
    console.log("here3");
    for (i = 0; i < myLength; i++) {
      let thisName = 'group1-shard' + (i+1) + 'of' + myLength + '.bin';
      let thisPath = 'https://aisight.ca/prestriate/quantized/' + thisName;
      let thisData = ais.urlMap[thisPath];
      let thisString = atob(thisData);
      let thisArray = new Uint8Array(thisString.length);
      for (let i = 0; i < thisString.length; i++) {
        thisArray[i] = thisString.charCodeAt(i);
      }
      let thisFile = new File([thisArray.buffer], thisName, {type: 'application/octet-stream'});
      myFiles.push(thisFile);
    }
    // console.log("here4");
    let myBlob = new Blob([myString], {type: 'application/json'});
    let myModel = await ais.loadModel(null, myBlob, myFiles);
    // console.log("here5");
    progress(0.25);
    //convert pixel string into array, remove alpha channel, set input size
    // let thisImage = JSON.parse('[' + imageData + ']');
    // thisImage = thisImage.filter((e, i) => (i + 1) % 4); // thisImage = thisImage.filter((myValue, myIndex) => myIndex % 4 == 0);
    const imageWidth = (thisImage.length / 3) ** (1/2);
    // console.log(imageWidth);
    progress(0.5);

    // console.log("here6");
    //convert pixel array into properly configured tensor
    let imageTensor = await tf.tidy(() => {
      let myTensor = tf.tensor(thisImage, [imageWidth, imageWidth, 3]);
      return myTensor.expandDims(0).toFloat().div(tf.scalar(255));
    });
    progress(0.75);

    // console.log("here7");
    //pass pixel array tensor to model for detection
    let thisPrediction = await ais.detectFromTensor(myModel, imageTensor);
    imageTensor.dispose();
    clearInterval(myTimer);
    progress(1);
    
    var centre_coords = [];

    thisPrediction.forEach(element => {  
      
      // console.log(element);
      if(element.category === 'person' || element.object === 'person'){
        // console.log("here");
        
        var x_coord = element.box[0]*0.4375; 
        var y_coord = element.box[1]*0.4375;
        var boxWidth = element.box[2]*0.4375;
        var boxHeight = element.box[3]*0.4375;

        var x_center = x_coord+(boxWidth/2);
        var y_center = y_coord+(boxHeight/2);
        
        var z_pixel = (3*imageWidth*parseInt(String(y_center).split('.')[0]))+(3*parseInt(String(x_center).split('.')[0]))
        
        var z_intensity = depthMap[z_pixel+1]

        // console.log(z_intensity);

        var z = z_intensity;
        var x = x_center * 0.0666;
        var y = y_center * 0.0666

        centre_coords = [x, y, z];
      }

    });

    return centre_coords;

  } catch(e) 
  {
    let errorString = 'Worker Crashed: ' + e;
    return errorString;
  }
}

async function main() {
  // let pathToVideo = "testvid1.mp4"
  let pathToFrames = "./input_frames";
  let pathToConvertedFrames = "./outputSet";
  let framesObjects = [];
  let framesPixelsArray = [];

  /* INPUT SET */
  // await createFrames("./../src/solo/rgb.mp4")                 //Split the video into frames


  let frames = fs.readdirSync(pathToFrames); //Read list of frames and sort them in ascending order
  frames.sort(function (a, b) {
    return a.length - b.length;
  });

  for (const frame of frames) {
    //Taking each frame in the list and converting the frame to pixel data buffer object.
    let pixelData = await getPixelData(`${pathToFrames}/${frame}`);
    framesObjects.push(pixelData);
  }

  framesObjects.forEach((element) => {
    //Adding only the Uint8 pixel data of frames to a list from the object
    framesPixelsArray.push(new Uint8Array(element.data));
  });

  const cleanedFrames = []

  framesPixelsArray.forEach((element) => {
    // console.log(element);
    let thisImage = JSON.parse('[' + element + ']');
    thisImage = thisImage.filter((e, i) => (i + 1) % 4); // thisImage = thisImage.filter((myValue, myIndex) => myIndex % 4 == 0);
    console.log(thisImage);
    cleanedFrames.push(thisImage);
  });

  // let thisImage = JSON.parse('[' + framesPixelsArray[0] + ']');
  // thisImage = thisImage.filter((e, i) => (i + 1) % 4); // thisImage = thisImage.filter((myValue, myIndex) => myIndex % 4 == 0);
  // console.log(thisImage);

  /*DCP COMPUTE*/
  const compute = require("dcp/compute");
  const job = compute.for([[cleanedFrames[0], cleanedFrames[2]],[cleanedFrames[1], cleanedFrames[3]]], work);
  const sliceOrder = [];

  job.on("accepted", () => {
    console.log(` - Job accepted by scheduler, waiting for results`);
    console.log(` - Job has id ${job.id}`);
  });

  job.on("readystatechange", (arg) => {
    console.log(`new ready state: ${arg}`);
  });

  job.on("console", (arg) => {
    console.log(arg.message);
  });

  // job.on("status", (arg) => {
  //   console.log(arg);
  // });

  job.on("result", (ev) => {
    sliceOrder.push(ev.sliceNumber);
    console.log(` - Received result for slice ${ev.sliceNumber}`);
  });

  job.public.name = "Distributed Object Detection - Erin and Arnab";
  job.computeGroups = [{ joinKey: "aitf", joinSecret: "9YDEXdihud" }];
  job.requires(["aistensorflow/tfjs", "aisfastquant/aisfastquant"]);
  // job.requires(["aistensorflow/tfjs"]);

  // let resultSet = await job.localExec(); //for executing the job locally OR
  let resultSet = await job.exec(); //for executing the job on DCP

  // // /* PROCESSING OF RESULTS */
  resultSet = Array.from(resultSet);
  // console.log(resultSet);

  resultSet.forEach(result => {
    console.log(result);
  });


  // console.log((resultSet[0][0] - resultSet[1][0])**2 + ((resultSet[0][1]-resultSet[1][1])**2) + ((resultSet[0][2]-resultSet[1][2])**2));
  // console.log( ((resultSet[0][1]-resultSet[1][1])**2));
  // console.log(((resultSet[0][2]-resultSet[1][2])**2));

  // Distance between both points  
  var dist = (((resultSet[0][0] - resultSet[1][0])**2) + ((resultSet[0][1]-resultSet[1][1])**2) + ((resultSet[0][2]-resultSet[1][2])**2))**(1/2);
  console.log('Distance between initial position and final position: ' + String(dist));
  
  // const parsedResults = Array.from(resultSet).map((slice) => JSON.parse(slice));

  
  // let zippedResultsDict = Object.assign(
  //   {},
  //   // ...sliceOrder.map((x, i) => ({ [x]: Array.from(parsedResults)[i] }))
  //   ...sliceOrder.map((x, i) => ({ [x]: resultSet[i] }))
  // );
  // let orderedResults = [];

  // for (let i = 1; i <= resultSet.length; ++i) {
  //   orderedResults.push(zippedResultsDict[i]);
  // }

  // orderedResults = orderedResults.flat();

  // console.log(orderedResults);



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

  /* SOLUTION FOR NON-DCP RESULTS */
  // for (let frame of framesPixelsArray) {
  //     frame = workFunction(frame);
  // }
  // for (var i = 0; i < framesObjects.length; i++) {    //Copying resulting pixel data of frames back to the list of object data of frames
  //     framesObjects[i].data = framesPixelsArray[i];
  // }

  /* SAVING CONVERTED FRAMES' OBJECTS TO FRAMES' IMAGES */
  // let counter = 0;
  // for(const frame of framesObjects){      //Loop to save each frame's object data as an image
  //     counter++;
  //     // console.log(frame);
  //     let bufferOut = await savePixels(frame, 'jpg'); // ndarray -> Uint8Array
  //     fs.writeFileSync(`./outputSet/output_${counter}.jpg`, bufferOut._obj);
  // }

  /* Stiching resulting frames to a video */
  // createVideo(pathToConvertedFrames);
}

// /* Initialize DCP Client and run main() */
require("dcp-client")
  .init(SCHEDULER_URL)
  .then(main)
  .catch(console.error)
  .finally(process.exit);
