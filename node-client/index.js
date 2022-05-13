
/**
 * @file        index.js
 * @author      Arnab Sagar, Arnab@kingsds.network
 * @date        May 2022
 *
 * Test app using DCP.
 */

 async function main() {
  const compute = require('dcp/compute');
  const wallet = require('dcp/wallet');
  
  // Rest of the code will go in the following sections:    

  /* INPUT SET */
  // const inputSet = ['a', 'b', 'a','a','a','a','a','t','e','y'];
  /* WORK FUNCTION */
  // async function workFunction(letter) {
  //   progress();
  //   return letter;
  // }
    
  /* COMPUTE FOR */
  const job = compute.for(
    ["a","b", "c", "d"], 
    async function workFn(a) {
      progress();        
      return a.toUpperCase();
    },
  );


  job.public.name = 'test job - arnab';

  const ks = await wallet.get(); /* usually loads ~/.dcp/default.keystore */
  job.setPaymentAccountKeystore(ks);

  job.on('accepted', () => {
      console.log(` - Job accepted by scheduler, waiting for results`);
      console.log(` - Job has id ${job.id}`);
      startTime = Date.now();
    });
    
    job.on('readystatechange', (arg) => {
     console.log(`new ready state: ${arg}`);
 
    });
    job.on('result', (arg) => {
      console.log(`new result: ${arg}`);
  
     });

  
  // job.requirements.strict = true;
  // job.requirements.discrete = true;
  
  const resultSet = await job.exec(0.1);

  results = Array.from(resultSet);
  console.log(results.toString());

}
require('dcp-client').init('https://scheduler.distributed.computer').then(main);

// http://scheduler.dev.arnab.office.kingsds.network