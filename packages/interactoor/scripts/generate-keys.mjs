import { Fr, GrumpkinScalar } from '@aztec/aztec.js/fields';

const privateKey = Fr.random();
const signingKey = GrumpkinScalar.random();

console.log('Generated example keys for .env.example:');
console.log('AZTEC_PRIVATE_KEY=' + privateKey.toString());
console.log('AZTEC_SIGNING_KEY=' + signingKey.toString());

