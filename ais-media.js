'use strict';
import * as config from './aisight-config';

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

const media = {
  drawPixelArrayToContext,
  drawBoxestoContext,
  drawImageToContext,
  processImage,
  processVideo,
  loadImage,
  loadVideo
};

export default media;
