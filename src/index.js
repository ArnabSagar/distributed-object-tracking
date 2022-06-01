// prestriate demo application
// aisight inc
// this build is not for commercial use

"use strict";
import backend from './backend';

(async function main() {
  try {

    //sets up canvas contexts for aisight logo, display area, and object boundary boxes overlay
    const logoContext = document.getElementById('logo-layer').getContext('2d');
    const displayContext = document.getElementById('display-layer').getContext('2d');

    document.getElementById('env_fieldset').style.display = 'none';

    //set up logo and drag-and-drop functionality
    await initializeLogo(logoContext);
    await dropFunctions(displayContext);
/*
    const streamingButton = document.getElementById('live-snap');

    streamingButton.addEventListener('click', function(ev){
      if (streamingButton.innerHTML == 'Start Stream') {
        liveTest(displayContext);
      } else if (streamingButton.innerHTML == 'Stop Stream') {
        streamingButton.innerHTML = 'Start Stream';
      }
      ev.preventDefault();
    }, false);
*/

  } catch(e) {
    console.error(e);
  }
})();

// draws and centers the aisight logo in the display area 
function initializeLogo(myContext, logoPath = 'logo.png') {
  let myImage = new Image();
  myImage.onload = function(e) {
    const MAX_WIDTH = myContext.canvas.width;
    const MAX_HEIGHT = myContext.canvas.height;
    let width = myImage.width;
    let height = myImage.height;

    let centreWidth = MAX_WIDTH / 2 - width / 2;
    let centreHeight = MAX_HEIGHT / 2 - height / 2

    myContext.drawImage(myImage, centreWidth, centreHeight, width, height);
  }
  myImage.src = logoPath;
}

function cameraSetup() {

  const select = document.getElementById('select');

  let currentStream;

  function stopMediaTracks(stream) {
    stream.getTracks().forEach(track => {
      track.stop();
    });
  }

  function gotDevices(mediaDevices) {
    select.innerHTML = '';
    select.appendChild(document.createElement('option'));
    let count = 1;
    mediaDevices.forEach(mediaDevice => {
      if (mediaDevice.kind === 'videoinput') {
        const option = document.createElement('option');
        option.value = mediaDevice.deviceId;
        const label = mediaDevice.label || `Camera ${count++}`;
        const textNode = document.createTextNode(label);
        option.appendChild(textNode);
        select.appendChild(option);
      }
    });
  }

  button.addEventListener('click', event => {
    if (typeof currentStream !== 'undefined') {
      stopMediaTracks(currentStream);
    }
    const videoConstraints = {};
    if (select.value === '') {
      videoConstraints.facingMode = 'environment';
    } else {
      videoConstraints.deviceId = { exact: select.value };
    }
    const constraints = {
      video: videoConstraints,
      audio: false
    };
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(stream => {
        currentStream = stream;
        video.srcObject = stream;
        return navigator.mediaDevices.enumerateDevices();
      })
      .then(gotDevices)
      .catch(error => {
        console.error(error);
      });
  });

  navigator.mediaDevices.enumerateDevices().then(gotDevices);

}

function liveTest(displayContext) {

  var width = 800;    // We will scale the photo width to this
  var height = 0;     // This will be computed based on the input stream

  var streaming = false;

  var video = null;
  var canvas = null;
  var photo = null;
  //var startbutton = null;

  let myBoxes = [];

  function startup() {

    video = document.getElementById('main-player');
    canvas = document.getElementById('display-layer');
    //photo = document.getElementById('live-photo');
    //startbutton = document.getElementById('live-snap');

    navigator.mediaDevices.getUserMedia({video: true, audio: false})
    .then(function(stream) {
      video.srcObject = stream;
      video.play();
    })
    .catch(function(err) {
      console.log('An error occurred: ' + err);
    });

    video.addEventListener('canplay', function(ev){
      if (!streaming) {

        height = video.videoHeight / (video.videoWidth/width);

        // Firefox currently has a bug where the height can't be read from
        // the video, so we will make assumptions if this happens.

        if (isNaN(height)) {
          height = width / (4/3);
        }

        video.setAttribute('width', width);
        video.setAttribute('height', height);
        canvas.setAttribute('width', width);
        canvas.setAttribute('height', height);
        streaming = true;
        document.getElementById('live-snap').innerHTML = 'Stop Stream';
        handleStream(displayContext, video);
      }
    }, false);
/*
    startbutton.addEventListener('click', function(ev){
      takepicture();
      ev.preventDefault();
    }, false);
*/
  }

  startup();
}

//sets up drag-and-drop behaviour
function dropFunctions(displayContext) {

  let dropArea = document.getElementById('drop-area');
  let dropInput = document.getElementById('file-input');

  //disables default behaviour for drag-and-drop events
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
  });

  //enables highlight class for display area
  ['dragenter', 'dragover', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, function(e) {
      dropArea.classList.add('highlight');
      displayContext.canvas.classList.add('highlight');
    }, false);
  });

  //disables highlight class for display area
  ['dragleave'].forEach(eventName => {
    dropArea.addEventListener(eventName, function(e) {
      dropArea.classList.remove('highlight');
      displayContext.canvas.classList.remove('highlight');
    }, false);
  });

  //gets dropped files to be processed and passes them to handleFiles
  dropArea.addEventListener('drop', function(e) {
    let myCompute = document.querySelector('input[name="environment"]:checked').value;
    let myFlag = false;
    (myCompute == 'scheduler') ? parallelFiles(displayContext, e.dataTransfer.files) : handleFiles(displayContext, e.dataTransfer.files);
  }, false);

  //gets uploaded files to be processed and passes them to handlefiles, enables highlight class
  dropInput.addEventListener('change', function() {
    dropArea.classList.add('highlight');
    displayContext.canvas.classList.add('highlight');
    let myCompute = document.querySelector('input[name="environment"]:checked').value;
    (myCompute == 'scheduler') ? parallelFiles(displayContext, this.files) : handleFiles(displayContext, this.files);
  }, false);
}

//disables default behaviour for event passed
function preventDefaults (e) {
  e.preventDefault();
  e.stopPropagation();
}

//handles real-time processing and detection of video streams
async function handleStream(
  displayContext,
  newStream,
  myCompute = document.querySelector('input[name="environment"]:checked').value,
  myArchitecture = document.querySelector('input[name="architecture"]:checked').value
) {

  document.getElementById('logo-layer').style.display = 'none';

  let downloadProgress = document.getElementById('download-progress');
  let downloadLabel = document.getElementById('download-label');

  let checkedCategories = document.querySelectorAll('input[name="categories"]:checked');
  let categoryArray = [];

  for (let i = 0; i < checkedCategories.length; i++) {
    categoryArray.push(checkedCategories[i].value);
  }

  let myBoxes = [];

  downloadProgress.style.width = '100%';
  downloadLabel.innerHTML = 'COMPUTING STREAM';

  let newContext = document.createElement('canvas').getContext('2d');
  let newWidth = displayContext.canvas.width
  let newHeight = displayContext.canvas.height
  newContext.canvas.width = newWidth;
  newContext.canvas.height = newHeight;

  do {

    newContext.drawImage(newStream, 0, 0, newWidth, newHeight);

    let myUrl = await newContext.canvas.toDataURL('image/png');
    let newImage = await backend.loadImage(myUrl, false);
    (URL || webkitURL).revokeObjectURL(myUrl);
    let newPixels = await backend.processImage(newImage);
    let newBoxes = (await backend.computeBatch([newPixels], myCompute, myArchitecture))[0];
    myBoxes.push(newBoxes);

    backend.drawPixelArrayToContext(newPixels, [newImage.width, newImage.height], displayContext, newBoxes, categoryArray);
  }
  while (document.getElementById('live-snap').innerHTML == 'Stop Stream');

  downloadLabel.innerHTML = '100% COMPUTED';

  displayContext.clearRect(0, 0, displayContext.canvas.width, displayContext.canvas.height);
  renderChart(displayContext, myBoxes);

  return myBoxes;
}

//distributes live stream frames for real time computation in parallel
async function parallelStream(
  displayContext,
  newStream,
  myCompute = document.querySelector('input[name="environment"]:checked').value,
  myArchitecture = document.querySelector('input[name="architecture"]:checked').value,
  batchSize = document.getElementById('env_slices').value
) {

}

//distributes all files for computation in parallel
async function parallelFiles(
  displayContext,
  newFiles,
  myCompute = document.querySelector('input[name="environment"]:checked').value,
  myArchitecture = document.querySelector('input[name="architecture"]:checked').value,
  myTimeout = (document.getElementById('env_timeout').value * 60000),
  batchSize = document.getElementById('env_slices').value
) {

  let taskStatus;

  taskStatus = 'initializing';

  document.getElementById('logo-layer').style.display = 'none';

  let deployBox = document.getElementById('deploy-box');
  let returnBox = document.getElementById('return-box');
  //let crashBox = document.getElementById('crash-box');
  let expireBox = document.getElementById('expire-box');

  let deployCount = 0;
  let returnCount = 0;
  //let crashCount = 0;
  let expireCount = 0;

  deployBox.innerHTML = deployCount;
  returnBox.innerHTML = returnCount;
  //crashBox.innerHTML = crashCount;
  expireBox.innerHTML = expireCount;

  let downloadProgress = document.getElementById('download-progress');
  let downloadLabel = document.getElementById('download-label');
  let displayLabel = document.getElementById('compute-label');

  let myFiles = [...newFiles];
  let myImages = [];
  let myBoxes = [];

  let totalSize = 0;
  let currentSize = 0;
  let myProgress = 0;

  downloadProgress.style.width = myProgress + '%';
  downloadLabel.innerHTML = myProgress + '% CONVERTED';
  displayLabel.innerHTML = '';
  displayLabel.style.display = 'block';

  let checkedCategories = document.querySelectorAll('input[name="categories"]:checked');
  let categoryArray = [];

  for (let i = 0; i < checkedCategories.length; i++) {
    categoryArray.push(checkedCategories[i].value);
  }

  for (let i = 0; i < myFiles.length; i++) {
    totalSize = totalSize + myFiles[i].size;
  }

  taskStatus = 'converting';

  for (let i = 0; i < myFiles.length; i++) {
    if (myFiles[i].type.indexOf('image/') !== -1) {

      displayLabel.innerHTML = 'CONVERTING';

      let myUrl = await (URL || webkitURL).createObjectURL(myFiles[i]);
      let newImage = await backend.loadImage(myUrl, false);
      displayContext = await backend.drawImageToContext(newImage, displayContext);

      let newPixels = await backend.processImage(newImage);

      (URL || webkitURL).revokeObjectURL(myUrl);
      currentSize = currentSize + myFiles[i].size;

      myImages.push(newPixels);

//      let newBoxes = (await backend.computeBatch([newPixels], myCompute, myArchitecture))[0];
//      backend.drawPixelArrayToContext(newPixels, [newImage.naturalWidth, newImage.naturalHeight], displayContext, newBoxes, categoryArray);
//      myBoxes.push(newBoxes);

    } else if (myFiles[i].type.indexOf('video/') !== -1) {

      displayLabel.innerHTML = 'CONVERTING';

      let myUrl = await (URL || webkitURL).createObjectURL(myFiles[i]);
      let newVideo = await backend.loadVideo(myUrl, false);
      let newFrames = await backend.processVideo(newVideo, displayContext);
      (URL || webkitURL).revokeObjectURL(myUrl);
      currentSize = currentSize + myFiles[i].size;

      for (let i = 0; i < newFrames.length; i++) {
 
        myImages.push(newFrames[i]);

//        let newBoxes = (await backend.computeBatch([newFrames[i]], myCompute, myArchitecture))[0];
//        backend.drawPixelArrayToContext(newFrames[i], [newVideo.videoWidth, newVideo.videoHeight], displayContext, newBoxes, categoryArray);
//        myBoxes.push(newBoxes);
      }

    } else {
      continue;
    }

    myProgress = ((currentSize / totalSize) * 100).toFixed(0);
    downloadProgress.style.width = myProgress + '%';
    downloadLabel.innerHTML = myProgress + '% CONVERTED';
  }
  displayLabel.innerHTML = 'COMPUTING';

  //document.getElementById('convert-label').style.display = 'none';
  //document.getElementById('compute-label').style.display = 'block';
/*
  myProgress = 100;
  downloadProgress.style.width = myProgress + '%';
  downloadLabel.innerHTML = myProgress + '% CONVERTED';
*/

  taskStatus = 'deploying';

  const cancelButton = document.getElementById('stop-button');

  const cancelEvent = new CustomEvent('batchStop');

  function cancelFunction() {
    document.dispatchEvent(cancelEvent);
  }

  cancelButton.addEventListener('click', cancelFunction);

  const totalCount = myImages.length;

  myProgress = 0;

  downloadProgress.style.width = myProgress + '%';
  downloadLabel.innerHTML = myProgress + '% COMPUTED';

  document.addEventListener('sliceReturn', function(event) {
    returnCount = returnCount + event.detail.count;
    returnBox.innerHTML = returnCount;
    myBoxes.push(event.detail.data);
    samPleaser();
  });
/*
  document.addEventListener('sliceCrash', function(event) {
    crashCount = crashCount + event.detail.count;
    crashBox.innerHTML = crashCount;
    samPleaser();
  });
*/
  document.addEventListener('batchExpire', function(event) {
    let expiredSlices = event.detail.count;
    expireCount = expireCount + expiredSlices;
    expireBox.innerHTML = expireCount;
    for (let i = 0; i < expiredSlices; i++) {
      myBoxes.push(event.detail.data);
    }
    samPleaser();
  });

  function samPleaser() {

    //let currentCount = returnCount + crashCount + expireCount;

    let currentCount = returnCount + expireCount;

    myProgress = ((currentCount / totalCount) * 100).toFixed(0);
    downloadProgress.style.width = myProgress + '%';
    downloadLabel.innerHTML = myProgress + '% COMPUTED';

    if (currentCount >= totalCount && taskStatus == 'waiting') {

      cancelButton.removeEventListener('click', cancelFunction);

      taskStatus = 'complete';
      console.log('Completed detections on ' + myFiles.length + ' file(s).');

      if ((myFiles.length == 1) && (myFiles[0].type.indexOf('image/') !== -1)) {

        displayLabel.innerHTML = '';
      } else {
        displayContext.clearRect(0, 0, displayContext.canvas.width, displayContext.canvas.height);
        renderChart(displayContext, myBoxes);
        displayLabel.innerHTML = '';
      }

    }
  }

  while (myImages.length > 0) {
    let thisBatch = myImages.splice(0, batchSize);

    let thisMessage = backend.callParallelDCP(thisBatch, myArchitecture, categoryArray, myTimeout, displayContext);
    //console.log(thisMessage);

    deployCount = deployCount + thisBatch.length;
    deployBox.innerHTML = deployCount;

    //myBoxes = myBoxes.concat(batchBoxes);

    //backend.drawImageToContext(thisBatch[thisBatch.length - 1], displayContext);
    //backend.drawBoxestoContext(batchBoxes[batchBoxes.length - 1], displayContext);
  }

  taskStatus = 'waiting';

  let dropArea = document.getElementById('drop-area');
  dropArea.classList.remove('highlight');
  displayContext.canvas.classList.remove('highlight');
  //document.getElementById('compute-label').style.display = 'none';
/*
  console.log('Completed detections on ' + myFiles.length + ' file(s).');

  console.log(myBoxes);

  if ((myFiles.length == 1) && (myFiles[0].type.indexOf('image/') !== -1)) {
  } else {
    displayContext.clearRect(0, 0, displayContext.canvas.width, displayContext.canvas.height);
    renderChart(displayContext, myBoxes);
  }
*/
}

//handles processing and then computation of files for detection
async function handleFiles(
  displayContext,
  newFiles,
  myCompute = document.querySelector('input[name="environment"]:checked').value,
  myArchitecture = document.querySelector('input[name="architecture"]:checked').value
) {

  document.getElementById('logo-layer').style.display = 'none';

  let downloadProgress = document.getElementById('download-progress');
  let downloadLabel = document.getElementById('download-label');
  let displayLabel = document.getElementById('compute-label');

  let myFiles = [...newFiles];
  let myImages = [];
  let myBoxes = [];

  let totalSize = 0;
  let currentSize = 0;
  let myProgress = 0;

  downloadProgress.style.width = myProgress + '%';
  downloadLabel.innerHTML = myProgress + '% COMPUTED';
  displayLabel.innerHTML = '';
  displayLabel.style.display = 'block';

  let checkedCategories = document.querySelectorAll('input[name="categories"]:checked');
  let categoryArray = [];

  for (let i = 0; i < checkedCategories.length; i++) {
    categoryArray.push(checkedCategories[i].value);
  }

  for (let i = 0; i < myFiles.length; i++) {
    totalSize = totalSize + myFiles[i].size;
  }

  for (let i = 0; i < myFiles.length; i++) {
    if (myFiles[i].type.indexOf('image/') !== -1) {

      displayLabel.innerHTML = 'COMPUTING';

      let myUrl = await (URL || webkitURL).createObjectURL(myFiles[i]);
      let newImage = await backend.loadImage(myUrl, false);
      let newPixels = await backend.processImage(newImage);
      (URL || webkitURL).revokeObjectURL(myUrl);
      currentSize = currentSize + myFiles[i].size;

      let newBoxes = (await backend.computeBatch([newPixels], myCompute, myArchitecture))[0];
      backend.drawPixelArrayToContext(newPixels.data, [newImage.naturalWidth, newImage.naturalHeight], displayContext, newBoxes, categoryArray);
      myBoxes.push(newBoxes);

    } else if (myFiles[i].type.indexOf('video/') !== -1) {

      let myUrl = await (URL || webkitURL).createObjectURL(myFiles[i]);
      let newVideo = await backend.loadVideo(myUrl, false);
      let newFrames = await backend.processVideo(newVideo);
      (URL || webkitURL).revokeObjectURL(myUrl);
      currentSize = currentSize + myFiles[i].size;

      for (let i = 0; i < newFrames.length; i++) {

        let newBoxes = (await backend.computeBatch([newFrames[i]], myCompute, myArchitecture))[0];
        backend.drawPixelArrayToContext(newFrames[i].data, [newVideo.videoWidth, newVideo.videoHeight], displayContext, newBoxes, categoryArray);
        myBoxes.push(newBoxes);

        displayLabel.innerHTML = 'VIDEO: ' + ((i / newFrames.length) * 100).toFixed(0) + '% COMPUTED';
      }

    } else {
      continue;
    }

    myProgress = ((currentSize / totalSize) * 100).toFixed(0);
    downloadProgress.style.width = myProgress + '%';
    downloadLabel.innerHTML = myProgress + '% COMPUTED';
  }
  displayLabel.style.display = 'none';

  //document.getElementById('convert-label').style.display = 'none';
  //document.getElementById('compute-label').style.display = 'block';
  myProgress = 100;
  downloadProgress.style.width = myProgress + '%';
  downloadLabel.innerHTML = myProgress + '% COMPUTED';
/*
  while (myImages.length > 0) {
    let thisBatch = myImages.splice(0, batchSize);
    let batchBoxes = await backend.computeBatch(thisBatch);
    myBoxes = myBoxes.concat(batchBoxes);

    backend.drawImageToContext(thisBatch[thisBatch.length - 1], displayContext);
    backend.drawBoxestoContext(batchBoxes[batchBoxes.length - 1], displayContext);
  }
*/
  let dropArea = document.getElementById('drop-area');
  dropArea.classList.remove('highlight');
  displayContext.canvas.classList.remove('highlight');
  document.getElementById('compute-label').style.display = 'none';

  console.log('Completed detections on ' + myFiles.length + ' file(s).');

  console.log(myBoxes);

  if ((myFiles.length == 1) && (myFiles[0].type.indexOf('image/') !== -1)) {
  } else {
    displayContext.clearRect(0, 0, displayContext.canvas.width, displayContext.canvas.height);
    renderChart(displayContext, myBoxes);
  }

}

//generates data labels for chart based on object bounding boxes
function createLabels(myBoxes) {

  let labelArray = [];
  let frameRate = 60/(document.getElementById('env_framerate').value);
  let myDuration = myBoxes.length * frameRate;

  for (let i = 0; i < myBoxes.length; i++) {

    let thisPosition = i * frameRate;

    let minutes = Math.floor((thisPosition / 60) * frameRate);
    let seconds = (thisPosition % 60) + '';

    labelArray[i] = minutes + ':' + seconds.padStart(2, '0');
  }
  return labelArray;
}

//configures chart format based on object bounding boxes
function prepareChartData(myBoxes) {

  let countArray = [];
  let myCategories = [];
  let checkedCategories = document.querySelectorAll('input[name="categories"]:checked');

  for (let i = 0; i < checkedCategories.length; i++) {
    myCategories.push(checkedCategories[i].value);
    countArray.push([]);
  }

  for (let i = 0; i < myBoxes.length; i++) {
    for (let j = 0; j < myCategories.length; j++) {
      countArray[j].push(0);
    }
    for (let j = 0; j < myBoxes[i].length; j++) {
      let thisCategory = myCategories.indexOf(myBoxes[i][j].category);
      if (thisCategory != -1) {
        countArray[thisCategory][i]++;
      }
    }
  }

  let myDatasets = [];
  let colorArray = ['blue', 'green', 'orange', 'red'];

  for (let i = 0; i < countArray.length; i++) {
    let thisDataset = {
      label: myCategories[i] +'s over time',
      data: countArray[i],
      backgroundColor: colorArray[i],
      borderColor: colorArray[i],
      fill: false,
      lineTension: 0,
      radius: 0
    };
    myDatasets.push(thisDataset);
  }
  return myDatasets;
}

//draws chart of object category and timing data based on object bounding boxes to the display area
function renderChart(displayContext, myBoxes) {

  //get the line chart canvas
  var ctx = displayContext;

  //line chart data
  var data = {
    labels: createLabels(myBoxes),
    datasets: prepareChartData(myBoxes)
  };

  //options
  var options = {
    responsive: true,
    title: {
      display: true,
      position: 'top',
      text: 'Total Detections',
      fontSize: 18,
      fontColor: '#111'
    },
    legend: {
      display: true,
      position: 'bottom',
      labels: {
        fontColor: '#333',
        fontSize: 16
      }
    },
    scales: {
      yAxes: [{
        ticks: {
          beginAtZero: true
        }
      }]
    }
  };

  //create Chart class object
  var chart = new Chart(ctx, {
    type: 'line',
    data: data,
    options: options
  });
}
