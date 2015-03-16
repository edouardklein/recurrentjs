# -*- coding: utf-8 -*-
# <nbformat>3.0</nbformat>

# <codecell>

import pandas as pd
metrics = pd.read_csv('metrics.csv', header=None)
metrics

# <codecell>

import matplotlib.pyplot as plt
%matplotlib inline

# <codecell>


plt.plot(metrics[0]*10+metrics[1],metrics[2])
plt.plot(metrics[0]*10+metrics[1],metrics[3])
plt.plot(metrics[0]*10+metrics[1],metrics[4])
plt.plot(metrics[0]*10+metrics[1],metrics[5])
plt.legend(['ppl', 'ppl_uk', 'cost', 'cost_uk'])
plt.xlabel('Ticks')

# <codecell>

plt.scatter(metrics[0],metrics[1], c='b')
plt.scatter(metrics[0],metrics[2], c='g')
#plt.scatter(metrics[0],metrics[3], c='r')
#plt.scatter(metrics[0],metrics[4], c='cyan')
plt.legend(['ppl', 
            'ppl_uk', 
#            'cost', 
#            'cost_uk'
            ])
plt.xlabel('Epochs')
plt.ylabel('Perplexity')

# <codecell>

plt.scatter(metrics[0][1:],metrics[1][1:], c='b')

# <codecell>

metrics[60:70]

