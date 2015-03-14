Exp1: src/test.js pratchett10.txt src/recurrent.js
	node src/test.js | tee log.txt
	grep metrics log.txt  | sed s/metrics:// > metrics.csv
	
