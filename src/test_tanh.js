Math.tanh = require('es5-ext/math/tanh');

for(var i=0.;i>-800;i-=0.1){
  var o = Math.tanh(i);
  if(isNaN(o)){
    console.log(i+' tanh returns NaN');
    console.log(Math.exp(-i))
    console.log(isNaN(Math.exp(-i)))
  }
}

console.log('No NaNs')
