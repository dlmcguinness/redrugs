# Repurposing Drugs Using Semantics (ReDrugS)
We aim to find new effective treatments for disease using existing drugs. Our approach is to gather and integrate existing data using semantic technologies to help discover promising drug repurposing.

Many diseases are based on genetic or epigenetic changes that can be targeted indirectly via upstream regulatory pathways. Targets need to have a high likelihood of affecting all possible changes, and so need to have upstream interactions that cover multiple genotypes/epigenotypes that might drive the same phenotype.

This interaction information is available from a number of sources, many of which are already available as linked data. The genes and proteins in these pathways also represented in linked data. By using existing published data from resources such as ArrayExpress and the Gene Expression Omnibus, we can potentially aggregate information that represents transcription, epigenetic, and genetic state in many different diseases using a common means of expression: the probability that a fact (a gene is expressed, a SNP is detected, a gene is methylated) is true. These facts and probabilities can be used to determine if, for instance, a drug target is likely to affect a particular phenotype. We can essentially simulate reactions of already-approved drugs by finding out what downstream effects they may have on disease. The simulation is enabled by background semantic models of effects and pathways.

_*source: [http://tw.rpi.edu/web/project/redrugs](http://tw.rpi.edu/web/project/redrugs)_

###To see a working version, please visit [redrugs.tw.rpi.edu](http://redrugs.tw.rpi.edu/)
