
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
      
  /* COMPUTE FOR */
  const job = compute.for(
    ["a","b", "c", "d"], 
    async function workFn(a) {
      progress();        
      return a.toUpperCase();
    },
  );


  job.public.name = 'Test job - arnab';

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
  
  const resultSet = await job.localExec();

  results = Array.from(resultSet);
  console.log(results.toString());

}
require('dcp-client').init('https://scheduler.distributed.computer').then(main);

// http://scheduler.dev.arnab.office.kingsds.network