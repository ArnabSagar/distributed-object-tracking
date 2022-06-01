'use strict';
import * as config from './config';
import * as work from './work';
//import * as tf from '@tensorflow/tfjs';
//import * as striate from '@aisight/aisfullquant';
//import * as prestriate from '@aisight/aisfastquant';
//import * as ethereumjswallet from 'ethereumjs-wallet';
//import * as ethereumjsutil from 'ethereumjs-util';

//draw pixel array and object bounding box overlay onto canvas context
function drawPixelArrayToContext(
  myPixels,
  myDimensions,
  myContext,
  myBoxes,
  myCategories = config.objectCategories
) {

  let savedMax = ((myPixels.length/4) ** (1/2));

  let originalWidth = myDimensions[0];
  let originalHeight = myDimensions[1];

  const maxWidth = myContext.canvas.width;
  const maxHeight = myContext.canvas.height;

  const savedRatio = Math.min(savedMax / originalWidth, savedMax / originalHeight);

  const savedWidth = originalWidth * savedRatio;
  const savedHeight = originalHeight * savedRatio;

  const offsetWidth = (savedMax - savedWidth) / 2;
  const offsetHeight = (savedMax - savedHeight) / 2;

  const mysteryRatio = Math.min(maxWidth / savedWidth, maxHeight / savedHeight);

  myContext.clearRect(0, 0, myContext.canvas.width, myContext.canvas.height);

  let myImageData = new ImageData(myPixels, savedMax, savedMax);

  let newContext = document.createElement('canvas').getContext('2d');
  newContext.canvas.width = savedMax;
  newContext.canvas.height = savedMax;

  newContext.putImageData(myImageData, 0, 0);
  newContext = drawBoxestoContext(myBoxes, newContext, myCategories);
  const targetWidth = savedWidth * mysteryRatio;
  const targetHeight = savedHeight * mysteryRatio;

  const targetOffsetWidth = (maxWidth - targetWidth) / 2;
  const targetOffsetHeight = (maxHeight - targetHeight) / 2;

  myContext.drawImage(newContext.canvas, offsetWidth, offsetHeight, savedWidth, savedHeight, targetOffsetWidth, targetOffsetHeight, targetWidth, targetHeight);

  return myContext;
}

//draw provided bounding boxes to a provided context
function drawBoxestoContext(
  myBoxes,
  myContext,
  myCategories = config.objectCategories,
  myThreshold = config.confidenceThreshold,
  myLines = config.boxLines,
  inputSize = config.imageWidth
) {

  let myWidthMod = myContext.canvas.width / inputSize;
  let myHeightMod = myContext.canvas.height / inputSize;

  //set line pixel width using provided thickness multiplier
  myContext.lineWidth = myContext.canvas.width * myLines;

  for (let i = 0; i < myBoxes.length; i++) {

    let myIndex = myCategories.indexOf(myBoxes[i].category);

    //draw only boxes of the provided categories and confidence threshold
    if ((myIndex != -1) && (myBoxes[i].score >= myThreshold)) {

      myBoxes[i].box[0] = myBoxes[i].box[0] * myWidthMod;
      myBoxes[i].box[1] = myBoxes[i].box[1] * myHeightMod;
      myBoxes[i].box[2] = myBoxes[i].box[2] * myWidthMod;
      myBoxes[i].box[3] = myBoxes[i].box[3] * myHeightMod;

      //set draw colours from array in config file
      myContext.strokeStyle = config.objectColours[myIndex];
      myContext.fillStyle = config.objectColours[myIndex];

      //draw bounding box
      myContext.beginPath();
      myContext.rect(...myBoxes[i].box);
      myContext.stroke();

      //draw filled label square above bounding box
      myContext.beginPath();
      myContext.rect(myBoxes[i].box[0], myBoxes[i].box[1], myBoxes[i].box[2], myContext.lineWidth * 10);
      myContext.fill()

      //draw object class text to label
      myContext.font = (myContext.lineWidth * 7) + 'px Courier New';
      myContext.textBaseline = 'top'; 
      myContext.fillStyle = '#FFFFFF';
      myContext.fillText(myBoxes[i].object, myBoxes[i].box[0], myBoxes[i].box[1]);
    }
  }

  return myContext;
}

//scale, centre, and draw provided media (image or video) to provided HTML context canvas
function drawImageToContext(
  myMedia,
  myContext
) {

  //check media type
  const isVideo = (myMedia.constructor.name === 'HTMLVideoElement');

  //get dimensions of provided media and context canvas
  let myWidth = isVideo ? myMedia.videoWidth : myMedia.naturalWidth;
  let myHeight = isVideo ? myMedia.videoHeight : myMedia.naturalHeight;
  const maxWidth = myContext.canvas.width;
  const maxHeight = myContext.canvas.height;

  //calculate new dimensions and centrepoints for fitting the image to the canvas
  const myRatio = Math.min(maxWidth / myWidth, maxHeight / myHeight);
  myWidth *= myRatio;
  myHeight *= myRatio;
  const centreWidth = maxWidth / 2 - myWidth / 2;
  const centreHeight = maxHeight / 2 - myHeight / 2;

  //clear provided context and draw the fitted image to the canvas
  myContext.clearRect(0, 0, maxWidth, maxHeight);
  myContext.drawImage(myMedia, centreWidth, centreHeight, myWidth, myHeight);

  return myContext;
}

//scale image down to network input size and get pixel array
function processImage(
  myMedia,
  inputSize = config.imageWidth
) {

  //create new canvas of network input size and draw provided media to it
  let myContext = document.createElement('canvas').getContext('2d');
  myContext.canvas.width = inputSize;
  myContext.canvas.height = inputSize;
  myContext = drawImageToContext(myMedia, myContext); //probably overkill when you don't need to render

  //generate pixel array for media from canvas context
  let imageData = myContext.getImageData(0, 0, inputSize, inputSize);

  return imageData;
}

//step through provided video extracting and converting frames at the provided time intervals
async function processVideo(
  myVideo,
  myContext = null,
  frameRate = 60/(config.framesPerMinute)
) {

  //pass on the image at the targeted time for conversion to pixel array
  function _extractFrame(thisVideo, myPosition) {
    return new Promise((resolve, reject) => {
      thisVideo.onseeked = event => {

          if (myContext) {
            myContext = drawImageToContext(thisVideo, myContext);
          }

          resolve(processImage(thisVideo));

      }
      myVideo.onerror = reject;
      myVideo.currentTime = myPosition;
    });
  }

  let myFrames = [];

  //iterate through the video, extracting an image every 'framerate' seconds
  for (let i = 0; i < myVideo.duration; i += frameRate) {
    let thisFrame = await _extractFrame(myVideo, i);
    myFrames.push(thisFrame);
  }

  return myFrames;
}

//loads and returns image from URL, with option to instead return the corresponding pixel array
function loadImage(
  myPath,
  processFlag = false
) {
  //creates html image and loads it with provided URL
  return new Promise((resolve, reject) => {
    let thisImage = document.createElement('img');
    thisImage.crossOrigin = 'anonymous';
    thisImage.onload = event => {
      //pass on image to be converted to pixel array, or return html image
      if (processFlag) {
        resolve(processImage(thisImage));
      } else {
        resolve(thisImage);
      }
    }
    thisImage.onerror = reject;
    thisImage.src = myPath;
  });
}

//loads and returns video from URL, with option to instead return a set of frames as pixel arrays
function loadVideo(
  myPath,
  processFlag = false,
  frameRate = 60/(config.framesPerMinute)
) {
  //creates html video and loads it with provided URL
  return new Promise((resolve, reject) => {
    let thisVideo = document.createElement('video');
    thisVideo.crossOrigin = 'anonymous';
    thisVideo.onloadedmetadata = event => {
      //pass on video to be processed into pixel array frames, or return html video
      if (thisVideo.duration) {
        if (processFlag) {
          resolve(processVideo(thisVideo, frameRate));
        } else {
          resolve(thisVideo);
        }
      }
    }
    thisVideo.onerror = reject;
    thisVideo.src = myPath;
  });
}

//coordinates the detections on the provided batch of images
async function computeBatch(
  myImages,
  myCompute = config.computePlatform,
  myArchitecture = config.computeModel
) {

/*
  let myResults = [];

  if (myCompute == 'scheduler') {

    //DCP computation prompts user for a wallet, then passes on the images
    if (myArchitecture == 'prestriate') {
      myResults = await callDCP(myImages, myArchitecture, work.aisFastQuantWorker);
    } else if (myArchitecture == 'striate') {
      myResults = await callDCP(myImages, myArchitecture, work.aisFullQuantWorker);
    } else {
      throw 'Invalid model architecture.';
    }

  } else if (myCompute == 'browser') {

    //load selected architecture unless it is already present in the global object
    if ((myArchitecture == 'prestriate') && (!global.hasOwnProperty('prestriate'))) {
      global.prestriate = await prestriate.loadModel('https://aisight.ca/prestriate/quantized/model.json');
    } else if ((myArchitecture == 'striate') && (!global.hasOwnProperty('striate'))) {
      global.striate = await striate.loadModel('https://aisight.ca/striate/quantized/model.json');
    }

    for (let i = 0; i < myImages.length; i++) {

      //converts images from Uint8ClampedArray to Array and removes alpha channel 
      let thisImage = Array.from(myImages[i].data);
      thisImage = thisImage.filter((e, i) => (i + 1) % 4);

      //calculates input dimensions for the model from the provided image
      const imageWidth = (thisImage.length / 3) ** (1/2);

      //converts image array to an appropriate tensor prior to loading into the model
      let imageTensor = await tf.tidy(() => {
        let myTensor = tf.tensor(thisImage, [imageWidth, imageWidth, 3]);
        return myTensor.expandDims(0).toFloat().div(tf.scalar(255));
      });

      let thisPrediction;

      //calls loaded object detection model with the provided image tensor and adds the results to an array
      if ((myArchitecture == 'prestriate') && (global.hasOwnProperty('prestriate'))) {
        thisPrediction = await prestriate.detectFromTensor(global.prestriate, imageTensor);
      } else if ((myArchitecture == 'striate') && (global.hasOwnProperty('striate'))) {
        thisPrediction = await striate.detectFromTensor(global.striate, imageTensor);
      } else {
        throw 'Model did not load correctly!';
      }

      imageTensor.dispose();
      myResults.push(thisPrediction);
    }
  } else {
      throw 'Invalid compute platform.';
  }

  return myResults;
*/
}

//distributed computation of frame batches (requires an available DCP client)
async function callParallelDCP(
  myImages,
  myArchitecture = config.computeModel,
  myCategories = config.objectCategories,
  myTimeout = config.sliceTimeout,
  myContext = null
) {

  let myWork;
  let myResults = [];
  let myDimensions = [];
  let myStrings = [];

  let remainingSlices = myImages.length;

  //convert all pixel arrays to strings before passing to DCP
  for (let i = 0; i < myImages.length; i++) {
    myDimensions.push([myImages[i].width, myImages[i].height]);
    myImages[i] = await myImages[i].data.toString();
  }

  if (myArchitecture == 'prestriate') {
    myWork = work.aisFastQuantWorker;
  } else if (myArchitecture == 'striate') {
    myWork = work.aisFullQuantWorker;
  } else {
    throw 'Invalid model architecture.';
  }

  //define DCP generator, which receives array of image strings and a work function
  const gen = dcp.compute.for(myImages, myWork);

  //gen.debug = true;

  gen.public = {
    name: 'aiSight (' + myArchitecture + ' Architecture)',
    description: 'Putting a digital mind behind your eyes.',
    link: 'https://aisight.ca',
  }

  //define necessary modules, which must be available on the DCP module server 

  gen.requires('tensorflowdcp/tfjs');

  if (myArchitecture == 'prestriate') {
    gen.requires('aisfastquant/aisfastquant.js');
  } else if (myArchitecture == 'striate') {
    gen.requires('aisfullquant/aisfullquant.js');
  } else {
    throw 'Invalid model architecture.';
  }

  gen.on('accepted', (thisOutput) => {
    console.log('Accepted: ' + gen.id);
  });
/*
  gen.work.on('uncaughtException',async (args)=>{
    console.log("ERROR: ", args.stack);
  });

  gen.work.on('console',async (args)=>{
    console.log(args);
  })
*/
  //receives and collects the results of each worker thread
  gen.on('result', (thisOutput) => {

    remainingSlices--;

    console.log(thisOutput);

    let thisResult = thisOutput.result;

//    let returnEvent = new CustomEvent('sliceReturn', {detail: {count: 1, data: thisOutput.result}});
//    let crashEvent = new CustomEvent('sliceCrash', {detail: {count: 1, data: []}});
//    let expireEvent = new CustomEvent('batchExpire', {detail: {count: 1, data: []}});

    if (typeof thisResult == 'string') {
      console.log('Slice #' + thisOutput.sliceNumber + ' has encountered an error.');
      thisResult = [];
    }

    if (myContext) {
      let thisImage = myImages[thisOutput.sliceNumber];
      thisImage = JSON.parse('[' + thisImage + ']');
      let thisData = Uint8ClampedArray.from(thisImage);
      myContext.clearRect(0, 0, myContext.canvas.width, myContext.canvas.height);
      myContext = drawPixelArrayToContext(thisData, myDimensions[thisOutput.sliceNumber], myContext, thisResult, myCategories);
    }

    myResults.push(thisResult);
    let returnEvent = new CustomEvent('sliceReturn', {detail: {count: 1, data: thisResult}});
    document.dispatchEvent(returnEvent);

/*
    if (thisOutput.result.indexOf('Worker Crashed') != -1) {
      document.dispatchEvent(crashEvent);
    } else if (thisOutput.result.indexOf('Worker Expired') != -1) {
      document.dispatchEvent(expireEvent);
    } else if (typeof thisOutput.result == 'string') {
      document.dispatchEvent(crashEvent);
    } else {

      if (myContext) {
        let thisImage = myImages[thisOutput.sliceNumber];
        thisImage = JSON.parse('[' + thisImage + ']');
        let thisData = Uint8ClampedArray.from(thisImage);
        myContext.clearRect(0, 0, myContext.canvas.width, myContext.canvas.height);
        myContext = drawPixelArrayToContext(thisData, myDimensions[thisOutput.sliceNumber], myContext, thisOutput.result, myCategories);
      } else {
        myResults.push(thisOutput.result);
      }

    }
*/
  });

  gen.on('complete', (thisOutput) => {
    console.log('Complete.');
  });
/*
  //worker thread title on DCP
  gen._generator.public = {
    name: 'aiSight'
  };
*/

  gen.requirements = {
    details: {
      offscreenCanvas: {
        bigTexture8192: true
      }
    },
    environment: {
      offscreenCanvas: true
    }
    /*machine: {
      //gpu: true
      //gpuBigTexture4096: true
      //gpuBigTexture8192: true
      //gpuBigTexture16384: true
      gpuBigTexture32768: true
    },*/
    /*engine: {     //   T U R N   T H I S   O F F
      es7: null
    }*/
  }

  console.log(gen.requirements);

  let myTimer = setTimeout(function(){
    console.log('Batch expired.');
    let batchEvent = new CustomEvent('batchExpire', {detail: {count: remainingSlices, data: []}});
    document.dispatchEvent(batchEvent);
    gen.cancel();
  }, myTimeout);

  document.addEventListener('batchStop', gen.cancel);

  await gen.exec();

  clearTimeout(myTimer);

  document.removeEventListener('batchStop', gen.cancel);

  let myTime = new Date().getTime(); 
  let myMessage ='Compute.for called with ' + myImages.length + ' slices at ' + myTime + '.';

  return myMessage;

}

//distributed computation of frame batches (requires an available DCP client)
async function callDCP(
  myImages,
  myArchitecture = config.computeModel,
  myWork = work.aisFastQuantWorker
) {

  let myResults = [];

  //convert all pixel arrays to strings before passing to DCP
  for (let i = 0; i < myImages.length; i++) {
    myImages[i] = myImages[i].data.toString();
  }

  if (myArchitecture == 'prestriate') {
    myWork = work.aisFastQuantWorker;
  } else if (myArchitecture == 'striate') {
    myWork = work.aisFullQuantWorker;
  } else {
    throw 'Invalid model architecture.';
  }

  //define DCP generator, which receives array of image strings and a work function
  const gen = dcp.compute.for([myImages], myWork);

  //define necessary modules, which must be available on the DCP module server 
  gen.requires('tensorflowdcp/tfjs');
  if (myArchitecture == 'prestriate') {
    gen.requires('aisfastquant/aisfastquant.js');
  } else if (myArchitecture == 'striate') {
    gen.requires('aisfullquant/aisfullquant.js');
  } else {
    throw 'Invalid model architecture.';
  }

  //receives and collects the results of each worker thread
  gen.on('result', (thisOutput) => {
    myResults.push(thisOutput.result);
  });

  //worker thread title on DCP
  gen._generator.public = {
    name: 'aiSight'
  };

  //sets gpu requirement and DCC payment, calls DCP generator on scheduler server
  gen._generator.capabilities = {gpu: true};
  await gen.exec(0.001);
  return myResults;

}

//general-use function that loads, converts, and run detections on all provided media files
async function handleFiles(
  newFiles,
  myCompute = config.computePlatform,
  myArchitecture = config.computeModel,
  batchSize = config.batchSlices
) {

  let myFiles = [...newFiles];

  let myImages = [];

  //identifies and creates URLs for all provided media files, before passing them on for loading and conversion to pixel arrays
  for (let i = 0; i < myFiles.length; i++) {
    if (myFiles[i].type.indexOf('image/') !== -1) {
      let myUrl = await (URL || webkitURL).createObjectURL(myFiles[i]);
      let newImage = await loadImage(myUrl, true);
      (URL || webkitURL).revokeObjectURL(myUrl);
      myImages.push(newImage);
    } else if (myFiles[i].type.indexOf('video/') !== -1) {
      let myUrl = await (URL || webkitURL).createObjectURL(myFiles[i]);
      let newFrames = await loadVideo(myUrl, true);
      (URL || webkitURL).revokeObjectURL(myUrl);
      myImages = myImages.concat(newFrames);
    } else {
      //uploaded file is not a valid type
    }
  }

  let myBoxes = [];

  //passes pixel array frames on for detection in a series of batches 
  while (myImages.length > 0) {
    let batchBoxes = await computeBatch(myImages.splice(0, batchSize), myCompute, myArchitecture, batchSize);
    myBoxes = myBoxes.concat(batchBoxes);
  }

  return myBoxes;
}

const backend = {
  drawPixelArrayToContext,
  drawBoxestoContext,
  drawImageToContext,
  processImage,
  processVideo,
  loadImage,
  loadVideo,
  computeBatch,
  callDCP,
  callParallelDCP,
  handleFiles
};

export default backend;
