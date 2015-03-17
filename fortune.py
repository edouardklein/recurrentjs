# -*- coding: utf-8 -*-
# <nbformat>3.0</nbformat>

# <codecell>

with open('the-singularity-is-near_clean.txt') as f:
    text = f.read()
#text
text = text.encode('ascii','ignore').decode()

# <codecell>

#Removing consecutive end of lines
import re
def remove_consecutive_CR(text):
    return re.sub('\n+','\n', text)
text = remove_consecutive_CR(text)
text[:1000]

# <codecell>

#Making the text a fortune file
text2 = remove_consecutive_CR(re.sub('([^\.]*\.)',r'\1\n%\n', text))
text2[:1000]
with open('Kurzweil_1s.txt', 'wb') as f:
    f.write(text2.encode('ascii'))

# <codecell>

text2.encode('ascii','ignore')[:1000]

# <codecell>

text2 = remove_conscutive_CR(re.sub('(([^\.]*\.){2})',r'\1\n%\n', text))
text2[:1000]
with open('Kurzweil_2s.txt', 'w') as f:
    f.write(text2)

# <codecell>

''.join(set(text2))

# <codecell>

text2.encode('ascii','ignore')[:1000].decode()

