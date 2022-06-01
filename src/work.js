export const devWorker = `async function(imageData) {

  try {

    tf = require('tfjs');
    ais = require('aisfastquant.js');

    function arrayToBinary(thisData) {
/*
      return thisData.split('').map(function (char) {
        return char.charCodeAt(0).toString(2);
      });
*/

      if (typeof atob === 'function') {
        let thisString = atob(thisData);
        return thisString;
      } else if (typeof window !== 'undefined' && typeof window.atob === 'function') {
        let thisString = window.atob(thisData);
        return thisString;
      } else if (typeof global !== 'undefined' && typeof global.atob === 'function') {
        let thisString = global.atob(thisData);
        return thisString;
      } else if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
        let thisString = Buffer.from(thisData, 'base64').toString('binary');
        return thisString;
      } else {
        throw 'No atob functions or buffer constructor in worker environment.';
      }

    }

    function progressCheck() {
      if (myIntervals > 12) {
        throw 'Worker Expired'
      }
      progress();
    }

    let myIntervals = 0;

    setInterval(progressCheck(myIntervals++), 10000);

    let myPath = 'https://aisight.ca/prestriate/quantized/model.json';
    let myData = ais.urlMap[myPath];
    let myString = await arrayToBinary(myData);

    let myObject = await JSON.parse(myString);

    let myFiles = [];
    let myLength = myObject.weightsManifest[0].paths.length;
    for (i = 0; i < myLength; i++) {
      let thisName = 'group1-shard' + (i+1) + 'of' + myLength + '.bin';
      let thisPath = 'https://aisight.ca/prestriate/quantized/' + thisName;
      let thisData = ais.urlMap[thisPath];
      let thisString = await arrayToBinary(thisData);
      let thisArray = new Uint8Array(thisString.length);
      for (let i = 0; i < thisString.length; i++) {
        thisArray[i] = thisString.charCodeAt(i);
      }
      let thisFile = new File([thisArray.buffer], thisName, {type: 'application/octet-stream'});
      myFiles.push(thisFile);
    }

    let myBlob = new Blob([myString], {type: 'application/json'});
    let myModel = await ais.loadModel(null, myBlob, myFiles);

    progress(0.25);

    //convert pixel string into array, remove alpha channel, set input size
    let thisImage = JSON.parse('[' + imageData + ']');
    thisImage = thisImage.filter((e, i) => (i + 1) % 4);
    const imageWidth = (thisImage.length / 3) ** (1/2);

    progress(0.5);

    //convert pixel array into properly configured tensor
    let imageTensor = await tf.tidy(() => {
      let myTensor = tf.tensor(thisImage, [imageWidth, imageWidth, 3]);
      return myTensor.expandDims(0).toFloat().div(tf.scalar(255));
    });

    progress(0.75);

    //pass pixel array tensor to model for detection 
    let thisPrediction = await ais.detectFromTensor(myModel, imageTensor);
    imageTensor.dispose();

    progress(1);

    return thisPrediction;

  } catch(e) {
    let errorString = 'Worker Crashed: ' + e;
    return errorString;
  }

}`;

export const aisFastQuantWorker = `async function(imageData) {

  try {

    tf = require('tfjs');
    ais = require('aisfastquant.js');

    progress(0);

    let myTimer = setInterval(function(){
      progress();
    }, 1000);

    let myPath = 'https://aisight.ca/prestriate/quantized/model.json';
    let myData = ais.urlMap[myPath];
    let myString = await atob(myData);

    let myObject = await JSON.parse(myString);

    let myFiles = [];
    let myLength = myObject.weightsManifest[0].paths.length;
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

    let myBlob = new Blob([myString], {type: 'application/json'});
    let myModel = await ais.loadModel(null, myBlob, myFiles);

    progress(0.25);

    //convert pixel string into array, remove alpha channel, set input size
    let thisImage = JSON.parse('[' + imageData + ']');
    thisImage = thisImage.filter((e, i) => (i + 1) % 4); // thisImage = thisImage.filter((myValue, myIndex) => myIndex % 4 == 0);
    const imageWidth = (thisImage.length / 3) ** (1/2);

    progress(0.5);

    //convert pixel array into properly configured tensor
    let imageTensor = await tf.tidy(() => {
      let myTensor = tf.tensor(thisImage, [imageWidth, imageWidth, 3]);
      return myTensor.expandDims(0).toFloat().div(tf.scalar(255));
    });

    progress(0.75);

    //pass pixel array tensor to model for detection 
    let thisPrediction = await ais.detectFromTensor(myModel, imageTensor);
    imageTensor.dispose();

    clearInterval(myTimer);

    progress(1);

    return thisPrediction;

  } catch(e) {
    let errorString = 'Worker Crashed: ' + e;
    return errorString;
  }

}`;


export const aisFullQuantWorker = `async function(imageData) {

  try {

    tf = require('tfjs');
    ais = require('aisfullquant.js');

    progress(0);

    let myTimer = setInterval(function(){
      progress();
    }, 1000);

    let myPath = 'https://aisight.ca/striate/quantized/model.json';
    let myData = ais.urlMap[myPath];
    let myString = await atob(myData);

    let myObject = await JSON.parse(myString);

    let myFiles = [];
    let myLength = myObject.weightsManifest[0].paths.length;
    for (i = 0; i < myLength; i++) {
      let thisName = 'group1-shard' + (i+1) + 'of' + myLength + '.bin';
      let thisPath = 'https://aisight.ca/striate/quantized/' + thisName;
      let thisData = ais.urlMap[thisPath];
      let thisString = atob(thisData);
      let thisArray = new Uint8Array(thisString.length);
      for (let i = 0; i < thisString.length; i++) {
        thisArray[i] = thisString.charCodeAt(i);
      }
      let thisFile = new File([thisArray.buffer], thisName, {type: 'application/octet-stream'});
      myFiles.push(thisFile);
    }

    let myBlob = new Blob([myString], {type: 'application/json'});
    let myModel = await ais.loadModel(null, myBlob, myFiles);

    progress(0.25);

    //convert pixel string into array, remove alpha channel, set input size
    let thisImage = JSON.parse('[' + imageData + ']');
    thisImage = thisImage.filter((e, i) => (i + 1) % 4);
    const imageWidth = (thisImage.length / 3) ** (1/2);

    progress(0.5);

    //convert pixel array into properly configured tensor
    let imageTensor = await tf.tidy(() => {
      let myTensor = tf.tensor(thisImage, [imageWidth, imageWidth, 3]);
      return myTensor.expandDims(0).toFloat().div(tf.scalar(255));
    });

    progress(0.75);

    //pass pixel array tensor to model for detection 
    let thisPrediction = await ais.detectFromTensor(myModel, imageTensor);
    imageTensor.dispose();

    clearInterval(myTimer);

    progress(1);

    return thisPrediction;

  } catch(e) {
    let errorString = 'Worker Crashed: ' + e;
    return errorString;
  }

}`;

export const aisFullQuantWorkerOld = `async function(imageData) {

  try {

    tf = require('tfjs');
    ais = require('aisfullquant.js');

    function arrayToBinary(thisData) {
/*
      if (typeof atob === 'function') {
        let thisString = atob(thisData);
        return thisString;
      } else if (typeof window !== 'undefined' && typeof window.atob === 'function') {
        let thisString = window.atob(thisData);
        return thisString;
      } else if (typeof global !== 'undefined' && typeof global.atob === 'function') {
        let thisString = global.atob(thisData);
        return thisString;
      } else if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
        let thisString = Buffer.from(thisData, 'base64').toString('binary');
        return thisString;
      } else {
        throw 'No atob functions or buffer constructor in worker environment.';
      }
*/
    }

    let myPath = 'https://aisight.ca/striate/quantized/model.json';
    let myData = ais.urlMap[myPath];
    //let myString = await arrayToBinary(myData);
    let myString = await atob(myData);

    let myObject = await JSON.parse(myString);

    let myFiles = [];
    let myLength = myObject.weightsManifest[0].paths.length;
    for (i = 0; i < myLength; i++) {
      let thisName = 'group1-shard' + (i+1) + 'of' + myLength + '.bin';
      let thisPath = 'https://aisight.ca/striate/quantized/' + thisName;
      let thisData = ais.urlMap[thisPath];
      //let thisString = arrayToBinary(thisData);
      let thisString = await atob(thisData);
      let thisArray = new Uint8Array(thisString.length);
      for (let i = 0; i < thisString.length; i++) {
        thisArray[i] = thisString.charCodeAt(i);
      }
      let thisFile = new File([thisArray.buffer], thisName, {type: 'application/octet-stream'});

      myFiles.push(thisFile);
    }

    let myBlob = new Blob([myString], {type: 'application/json'});
    let myModel = await ais.loadModel(null, myBlob, myFiles);

    progress(0.25);

    //convert pixel string into array, remove alpha channel, set input size
    let thisImage = JSON.parse('[' + imageData + ']');
    thisImage = thisImage.filter((e, i) => (i + 1) % 4);
    const imageWidth = (thisImage.length / 3) ** (1/2);

    progress(0.5);

    //convert pixel array into properly configured tensor
    let imageTensor = await tf.tidy(() => {
      let myTensor = tf.tensor(thisImage, [imageWidth, imageWidth, 3]);
      return myTensor.expandDims(0).toFloat().div(tf.scalar(255));
    });

    progress(0.75);

    //pass pixel array tensor to model for detection 
    let thisPrediction = await ais.detectFromTensor(myModel, imageTensor);
    imageTensor.dispose();

    progress(1);

    return thisPrediction;

  } catch(e) {
    let errorString = 'Worker Crashed: ' + e;
    return errorString;
  }

}`;

export const backupWorker = `async function(imageData) {

  try {

    tf = require('tfjs');
    ais = require('aisfullquant.js');

    if (typeof window.atob == 'undefined') {
      function atob(thisData) {
        let thisBuffer = new Buffer(thisData, 'base64').toString('binary');
        return thisBuffer;
      };
    }

    setInterval(progress(), 5000);

    let myPath = 'https://aisight.ca/striate/quantized/model.json';
    let myData = ais.urlMap[myPath];
    let myString = await atob(myData);
    let myObject = await JSON.parse(myString);

    let myFiles = [];
    let myLength = myObject.weightsManifest[0].paths.length;
    for (i = 0; i < myLength; i++) {
      let thisName = 'group1-shard' + (i+1) + 'of' + myLength + '.bin';
      let thisPath = 'https://aisight.ca/striate/quantized/' + thisName;
      let thisData = ais.urlMap[thisPath];
      let thisString = atob(thisData);
      let thisArray = new Uint8Array(thisString.length);
      for (let i = 0; i < thisString.length; i++) {
        thisArray[i] = thisString.charCodeAt(i);
      }
      let thisFile = new File([thisArray.buffer], thisName, {type: 'application/octet-stream'});
      myFiles.push(thisFile);
    }

    let myBlob = new Blob([myString], {type: 'application/json'});
    let myModel = await ais.loadModel(null, myBlob, myFiles);

    progress(0.25);

    //convert pixel string into array, remove alpha channel, set input size
    let thisImage = JSON.parse('[' + imageData + ']');
    thisImage = thisImage.filter((e, i) => (i + 1) % 4);
    const imageWidth = (thisImage.length / 3) ** (1/2);

    progress(0.5);

    //convert pixel array into properly configured tensor
    let imageTensor = await tf.tidy(() => {
      let myTensor = tf.tensor(thisImage, [imageWidth, imageWidth, 3]);
      return myTensor.expandDims(0).toFloat().div(tf.scalar(255));
    });

    progress(0.75);

    //pass pixel array tensor to model for detection 
    let thisPrediction = await ais.detectFromTensor(myModel, imageTensor);
    imageTensor.dispose();

    progress(1);

    return thisPrediction;

  } catch(e) {
    let errorString = 'error: ' + e;
    return errorString;
  }
}`;
