var R = require('./recurrent.js')
fs = require('fs')

// prediction params
var sample_softmax_temperature = 1.0; // how peaky model predictions should be
var max_chars_gen = 100; // max length of generated sentences

// model parameters
generator = 'lstm'; // can be 'rnn' or 'lstm'
hidden_sizes = [100]; // list of sizes of hidden layers
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

//var inputData = fs.readFileSync('./pratchett10.txt', 'utf8');

var initVocab = function(txt, count_threshold) {
  // go over all characters and keep track of all unique ones seen

  // count up all characters
  var d = {};
  for(var i=0,n=txt.length;i<n;i++) {
    var txti = txt[i];
    if(txti in d) { d[txti] += 1; }
    else { d[txti] = 1; }
  }

  // filter by count threshold and create pointers
  letterToIndex = {};
  indexToLetter = {};
  vocab = [];
  // NOTE: start at one because we will have START and END tokens!
  // that is, START token will be index 0 in model letter vectors
  // and END token will be index 0 in the next character softmax
  var q = 1;
  for(ch in d) {
    if(d.hasOwnProperty(ch)) {
      if(d[ch] >= count_threshold) {
        // add character to vocab
        letterToIndex[ch] = q;
        indexToLetter[q] = ch;
        vocab.push(ch);
        q++;
      }
    }
  }

  // globals written: indexToLetter, letterToIndex, vocab (list), and:
  input_size = vocab.length + 1;
  output_size = vocab.length + 1;
  //epoch_size = sents.length;
  console.log('found ' + vocab.length + ' distinct characters: ' + vocab.join(''));
}

var utilAddToModel = function(modelto, modelfrom) {
  for(var k in modelfrom) {
    if(modelfrom.hasOwnProperty(k)) {
      // copy over the pointer but change the key to use the append
      modelto[k] = modelfrom[k];
    }
  }
}

var initModel = function() {
  // letter embedding vectors
  var model = {};
  model['Wil'] = new R.RandMat(input_size, letter_size , 0, 0.08);

  if(generator === 'rnn') {
    var rnn = R.initRNN(letter_size, hidden_sizes, output_size);
    utilAddToModel(model, rnn);
  } else {
    var lstm = R.initLSTM(letter_size, hidden_sizes, output_size);
    utilAddToModel(model, lstm);
  }

  return model;
}

var reinit = function(opt) {
  // note: reinit writes global vars

  // eval options to set some globals
  eval(opt);

  solver = new R.Solver(); // reinit solver

  ppl_list = [];
  tick_iter = 0;


  initVocab(',w}hV84zmBG 2u&.(-5aKjY6ZtiloRTX{EW]QdH)nCAkMgbxJ0F[=:/1?Pq3L$sp%\'S"O!D;9e\nr+vIU7yNfc', 1); // takes count threshold for characters
  model = initModel();
}

var saveModel = function(filename) {
  var out = {};
  out['hidden_sizes'] = hidden_sizes;
  out['generator'] = generator;
  out['letter_size'] = letter_size;
  var model_out = {};
  for(var k in model) {
    if(model.hasOwnProperty(k)) {
      model_out[k] = model[k].toJSON();
    }
  }
  out['model'] = model_out;
  out['letterToIndex'] = letterToIndex;
  out['indexToLetter'] = indexToLetter;
  out['vocab'] = vocab;
  fs.writeFileSync(filename,JSON.stringify(out));
}

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
  var i = 0;
  console.log('Before loop');
  while(i < max_chars_gen) {
	i += 1;

  console.log('CP1');
    // RNN tick
    var ix = s.length === 0 ? 0 : letterToIndex[s[s.length-1]];
    var lh = forwardIndex(G, model, ix, prev);
    prev = lh;
  console.log('CP2');

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

  console.log('CP3');
    probs = R.softmax(logprobs);
console.log('CP3.5')
    if(samplei) {
console.log('CP3.5 true');
      var ix = R.samplei(probs.w);
    } else {
console.log('CP3.5 else');
      var ix = R.maxi(probs.w);
    }

  console.log('CP4');
    if(ix === 0) break; // END token predicted, break out

    var letter = indexToLetter[ix];
    s += letter;
  }
console.log('After loop');
  return s;
}

var costfun = function(model, sent) {
  // takes a model and a sentence and
  // calculates the loss. Also returns the Graph
  // object which can be used to do backprop
  var n = sent.length;
  var G = new R.Graph();
  var log2ppl = 0.0;
  var cost = 0.0;
  var prev = {};
  for(var i=-1;i<n;i++) {
    // start and end tokens are zeros
    var ix_source = i === -1 ? 0 : letterToIndex[sent[i]]; // first step: start with START token
    var ix_target = i === n-1 ? 0 : letterToIndex[sent[i+1]]; // last step: end with END token

    lh = forwardIndex(G, model, ix_source, prev);
    prev = lh;

    // set gradients into logprobabilities
    logprobs = lh.o; // interpret output as logprobs
    probs = R.softmax(logprobs); // compute the softmax probabilities

    log2ppl += -Math.log2(probs.w[ix_target]); // accumulate base 2 log prob and do smoothing
    cost += -Math.log(probs.w[ix_target]);

    // write gradients into log probabilities
    logprobs.dw = probs.w;
    logprobs.dw[ix_target] -= 1
  }
  var ppl = Math.pow(2, log2ppl / (n - 1));
  return {'G':G, 'ppl':ppl, 'cost':cost};
}

function median(values) {
  values.sort( function(a,b) {return a - b;} );
  var half = Math.floor(values.length/2);
  if(values.length % 2) return values[half];
  else return (values[half-1] + values[half]) / 2.0;
}

var ppl_list = [];
var tick_iter = 0;
var tick = function(sent) {

  // sample sentence fromd data
  //var sentix = R.randi(0,data_sents.length);
  //var sent = data_sents[sentix];

  var t0 = +new Date();  // log start timestamp

  // evaluate cost function on a sentence
  var cost_struct = costfun(model, sent);

  // use built up graph to compute backprop (set .dw fields in mats)
  cost_struct.G.backward();
  // perform param update
  var solver_stats = solver.step(model, learning_rate, regc, clipval);
  //$("#gradclip").text('grad clipped ratio: ' + solver_stats.ratio_clipped)

  var t1 = +new Date();
  var tick_time = t1 - t0;

  ppl_list.push(cost_struct.ppl); // keep track of perplexity

  tick_iter += 1;
  // evaluate cost function on a never seen before sentence
  var cost_struct_on_unknown = costfun(model, "Most armies are in fact run by their sergeants.");
  return {'ppl':cost_struct.ppl, 'cost':cost_struct.cost,
          'ppl_on_unknown':cost_struct_on_unknown.ppl,
          'cost_on_unknown':cost_struct_on_unknown.cost,
          'time':tick_time};
}

var gradCheck = function() {
  var model = initModel();
  var sent = '^test sentence$';
  var cost_struct = costfun(model, sent);
  cost_struct.G.backward();
  var eps = 0.000001;

  for(var k in model) {
    if(model.hasOwnProperty(k)) {
      var m = model[k]; // mat ref
      for(var i=0,n=m.w.length;i<n;i++) {

        oldval = m.w[i];
        m.w[i] = oldval + eps;
        var c0 = costfun(model, sent);
        m.w[i] = oldval - eps;
        var c1 = costfun(model, sent);
        m.w[i] = oldval;

        var gnum = (c0.cost - c1.cost)/(2 * eps);
        var ganal = m.dw[i];
        var relerr = (gnum - ganal)/(Math.abs(gnum) + Math.abs(ganal));
        if(relerr > 1e-1) {
          console.log(k + ': numeric: ' + gnum + ', analytic: ' + ganal + ', err: ' + relerr);
        }
      }
    }
  }
}
var execSync = require('exec-sync');

reinit()
var sentence = "Modeling the Brain. In contemporary neuroscience, models and simulations are being developed from diverse sources, including brain scans, interneuronal connection models, neuronal models, and psychophysical testing. As mentioned earlier, auditory-system researcher Lloyd Watts has developed a comprehensive model of a significant portion of the human auditory-processing system from neurobiology studies of specific neuron types and interneuronal-connection information. Watts's model includes five parallel paths and the actual representations of auditory information at each stage of neural processing. Watts has implemented his model in a computer as real-time software that can locate and identify sounds and functions, similar to the way human hearing operates. Although a work in progress, the model illustrates the feasibility of converting neurobiological models and brain-connection data into working simulations.";
console.log('Sentence 1 whose length is '+sentence.length)
metrics = tick(sentence);
console.log('time:'+sentence.length+', '+metrics.time)
var sentence_soft_no_primer = predictSentence(model, true, sample_softmax_temperature);
console.log(metrics)
console.log('metrics:'+[1, metrics.ppl, metrics.ppl_on_unknown, metrics.cost, metrics.cost_on_unknown].join(','));
console.log(sentence_soft_no_primer)
console.log('');

sentence = "It is not even necessary to express one's thoughts in physical action to provoke the brain to rewire itself. Dr. Alvaro Pascual-Leone at Harvard University scanned the brains of volunteers before and after they practiced a simple piano exercise. The brain motor cortex of the volunteers changed as a direct result of their practice. He then had a second group just think about doing the piano exercise but without actually moving any muscles. This produced an equally pronounced change in the motor-cortex network.64"
console.log('Sentence 2 whose length is '+sentence.length)
metrics = tick(sentence);
console.log('time:'+sentence.length+', '+metrics.time)
var sentence_soft_no_primer = predictSentence(model, true, sample_softmax_temperature);
console.log(metrics)
console.log('metrics:'+[2, metrics.ppl, metrics.ppl_on_unknown, metrics.cost, metrics.cost_on_unknown].join(','));
console.log(sentence_soft_no_primer)
console.log('');

sentence = "The Multiverse. Recently a more Darwinian approach to the strong anthropic principle has been proposed. Consider that it is possible for mathematical equations to have multiple solutions. For example, if we solve for x in the equation x2 = 4, x may be 2 or -2. Some equations allow for an infinite number of solutions. In the equation (a  b)  x = 0, x can take on anyone of an infinite number of values if a = b (since any number multiplied by zero equals zero). It turns out that the equations for recent string theories allow in principle for an infinite number of solutions. To be more precise, since the spatial and temporal resolution of the universe is limited to the very small Planck constant, the number of solutions is not literally infinite but merely vast. String theory implies, therefore, that many different sets of natural constants are possible."
console.log('Sentence 3 whose length is '+sentence.length)
metrics = tick(sentence);
console.log('time:'+sentence.length+', '+metrics.time)
var sentence_soft_no_primer = predictSentence(model, true, sample_softmax_temperature);
console.log(metrics)
console.log('metrics:'+[3, metrics.ppl, metrics.ppl_on_unknown, metrics.cost, metrics.cost_on_unknown].join(','));
console.log(sentence_soft_no_primer)
console.log('');

sentence = "In some ways the biochemical mechanism of life is remarkably complex and intricate. In other ways it is remarkably simple. Only four base pairs provide the digital storage for all of the complexity of human life and all other life as we know it. The ribosomes build protein chains by grouping together triplets of base pairs to select sequences from only twenty amino acids. The amine acids themselves are relatively simple, consisting of a carbon atom with its four bonds linked to one hydrogen atom, one amino (-NH2) group, one carboxylic acid (-COOH) group, and one organic group that is different for each amino acid. The organic group for alanine, for example, has only four atoms (CH3-) for a total of thirteen atoms. One of the more complex amino acids, arginine (which plays a vital role in the health of the endothelial cells in our arteries) has only seventeen atoms in its organic group for a total of twenty-six atoms. These twenty simple molecular fragments are the building blocks of al life."
console.log('Sentence 4 whose length is '+sentence.length)
metrics = tick(sentence);
console.log('time:'+sentence.length+', '+metrics.time)
var sentence_soft_no_primer = predictSentence(model, true, sample_softmax_temperature);
console.log(metrics)
console.log('metrics:'+[4, metrics.ppl, metrics.ppl_on_unknown, metrics.cost, metrics.cost_on_unknown].join(','));
console.log(sentence_soft_no_primer)
console.log('');

sentence = "More has at the same time expressed concern that anticipating the Singularity could engender a passivity in addressing today's issues.\"6 Because the enormous capability to overcome age-old problems is on the horizon, there may be a tendency to grow detached from mundane, present-day concerns. I share More's antipathy toward \"passive Singularitarianism,\" One reason for a proactive stance is that technology is a double-edged sword and as such always has the potential of going awry as it surges toward the Singularity, with profoundly disturbing consequences. Even small delays in implementing emerging technologies can condemn millions of people to continued suffering and death. As one example of many, excessive regulatory delays in implementing lifesaving therapies end up costing many lives. (We lose millions of people per year around the world from heart disease alone.)"
console.log('Sentence 5 whose length is '+sentence.length)
metrics = tick(sentence);
console.log('time:'+sentence.length+', '+metrics.time)
var sentence_soft_no_primer = predictSentence(model, true, sample_softmax_temperature);
console.log(metrics)
console.log('metrics:'+[5, metrics.ppl, metrics.ppl_on_unknown, metrics.cost, metrics.cost_on_unknown].join(','));
console.log(sentence_soft_no_primer)
console.log('');

sentence = "New land-based robotic telescopes are able to make their own decisions on where to look and how to optimize the likelihood of finding desired phenomena. Called \"autonomous, semi-intelligent observatories,\" the systems can adjust to the weather, notice items of interest, and decide on their own to track them. They are able to detect very subtle phenomena, such as a star blinking for a nanosecond, which may indicate a small asteroid in the outer regions of our solar system passing in front of the light from that star.187 One such system, called Moving Object and Transient Event Search System (MOTESS), has identified on its own 180 new asteroids and several comets during its first two years of operation. \"We have an intelligent observing system,\" explained University of Exeter astronomer Alasdair Allan. \"It thinks and reacts for itself, deciding whether something it has discovered is interesting enough to need more observations. If more observations are needed, it just goes ahead and gets them.\""
console.log('Sentence 6 whose length is '+sentence.length)
metrics = tick(sentence);
console.log('time:'+sentence.length+', '+metrics.time)
var sentence_soft_no_primer = predictSentence(model, true, sample_softmax_temperature);
console.log(metrics)
console.log('metrics:'+[6, metrics.ppl, metrics.ppl_on_unknown, metrics.cost, metrics.cost_on_unknown].join(','));
console.log(sentence_soft_no_primer)
console.log('');
