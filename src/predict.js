var R = require('./recurrent.js')
fs = require('fs')

// prediction params
var sample_softmax_temperature = 1.0; // how peaky model predictions should be
var max_chars_gen = 100; // max length of generated sentences

// model parameters
generator = 'lstm'; // can be 'rnn' or 'lstm'
hidden_sizes = [10]; // list of sizes of hidden layers
letter_size = 5; // size of letter embeddings

// optimization
regc = 0.000001; // L2 regularization strength
learning_rate = 0.01; // learning rate
clipval = 5.0; // clip gradients at this value


// various global var inits
var epoch_size = -1;
var input_size = -1;
var output_size = -1;
var letterToIndex = {};
var indexToLetter = {};
var vocab = [];
var data_sents = [];
var solver = new R.Solver(); // should be class because it needs memory for step caches
//var pplGraph = new Rvis.Graph();

var model = {};

var loadModel = function(j) {
  hidden_sizes = j.hidden_sizes;
  generator = j.generator;
  letter_size = j.letter_size;
  model = {};
  for(var k in j.model) {
    if(j.model.hasOwnProperty(k)) {
      var matjson = j.model[k];
      model[k] = new R.Mat(1,1);
      model[k].fromJSON(matjson);
    }
  }
  letterToIndex = j['letterToIndex'];
  indexToLetter = j['indexToLetter'];
  vocab = j['vocab'];

  // reinit these
  ppl_list = [];
  tick_iter = 0;
  solver = new R.Solver(); // have to reinit the solver since model changed
}

var forwardIndex = function(G, model, ix, prev) {
  var x = G.rowPluck(model['Wil'], ix);
  // forward prop the sequence learner
  if(generator === 'rnn') {
    var out_struct = R.forwardRNN(G, model, hidden_sizes, x, prev);
  } else {
    var out_struct = R.forwardLSTM(G, model, hidden_sizes, x, prev);
  }
  return out_struct;
}

var predictSentence = function(model, samplei, temperature, primer) {
  if(typeof samplei === 'undefined') { samplei = false; }
  if(typeof temperature === 'undefined') { temperature = 1.0; }
  if(typeof primer === 'undefined'){ primer = ''}

  var G = new R.Graph(false);
  var s = primer;
  var prev = {};
  while(true) {

    // RNN tick
    var ix = s.length === 0 ? 0 : letterToIndex[s[s.length-1]];
    var lh = forwardIndex(G, model, ix, prev);
    prev = lh;

    // sample predicted letter
    logprobs = lh.o;
    if(temperature !== 1.0 && samplei) {
      // scale log probabilities by temperature and renormalize
      // if temperature is high, logprobs will go towards zero
      // and the softmax outputs will be more diffuse. if temperature is
      // very low, the softmax outputs will be more peaky
      for(var q=0,nq=logprobs.w.length;q<nq;q++) {
        logprobs.w[q] /= temperature;
      }
    }

    probs = R.softmax(logprobs);
    if(samplei) {
      var ix = R.samplei(probs.w);
    } else {
      var ix = R.maxi(probs.w);
    }

    if(ix === 0) break; // END token predicted, break out
    if(s.length > max_chars_gen) { break; } // something is wrong

    var letter = indexToLetter[ix];
    s += letter;
  }
  return s;
}

jsonModel = fs.readFileSync(process.argv[2]);
var j = JSON.parse(jsonModel);
loadModel(j);
var sentence_soft_no_primer = predictSentence(model, true, sample_softmax_temperature);
var sentence_soft_primer = predictSentence(model, true, sample_softmax_temperature, "Imagination ");
var sentence_argmax_no_primer = predictSentence(model, false);
var sentence_argmax_primer = predictSentence(model, false, '', "Imagination ");
console.log(sentence_soft_no_primer)
console.log(sentence_soft_primer)
console.log(sentence_argmax_no_primer)
console.log(sentence_argmax_primer)
//repl;
//var iid = null;
// $(function() {
//
//   // attach button handlers
//   $('#learn').click(function(){
//     reinit();
//     if(iid !== null) { clearInterval(iid); }
//     iid = setInterval(tick, 0);
//   });
//   $('#stop').click(function(){
//     if(iid !== null) { clearInterval(iid); }
//     iid = null;
//   });
//   $("#resume").click(function(){
//     if(iid === null) {
//       iid = setInterval(tick, 0);
//     }
//   });
//
//   $("#savemodel").click(saveModel);
//   $("#loadmodel").click(function(){
//     var j = JSON.parse($("#tio").val());
//     loadModel(j);
//   });
//
//   $("#loadpretrained").click(function(){
//     $.getJSON("lstm_100_model.json", function(data) {
//       pplGraph = new Rvis.Graph();
//       learning_rate = 0.0001;
//       reinit_learning_rate_slider();
//       loadModel(data);
//     });
//   });
//
//   $("#learn").click(); // simulate click on startup
//
//   //$('#gradcheck').click(gradCheck);
//
//   $("#temperature_slider").slider({
//     min: -1,
//     max: 1.05,
//     step: 0.05,
//     value: 0,
//     slide: function( event, ui ) {
//       sample_softmax_temperature = Math.pow(10, ui.value);
//       $("#temperature_text").text( sample_softmax_temperature.toFixed(2) );
//     }
//   });
//});
