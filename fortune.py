# -*- coding: utf-8 -*-
# <nbformat>3.0</nbformat>

# <codecell>

with open('the-singularity-is-near_clean.txt') as f:
    text = f.read()
text[:1000]

# <codecell>

#Removing consecutive end of lines
import re
def remove_conscutive_CR(text):
    return re.sub('\n+','\n', text)
text = remove_conscutive_CR(text)
text[:1000]

# <codecell>

#Making the text a fortune file
text2 = remove_conscutive_CR(re.sub('([^\.]*\.)',r'\1\n%\n', text))
text2[:1000]
with open('Kurzweil_1s.txt', 'w') as f:
    f.write(text2)

# <codecell>

text2 = remove_conscutive_CR(re.sub('(([^\.]*\.){2})',r'\1\n%\n', text))
text2[:1000]
with open('Kurzweil_2s.txt', 'w') as f:
    f.write(text2)

# <codecell>

''.join(set(text))

