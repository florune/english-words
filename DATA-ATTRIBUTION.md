# Word list attribution

This project includes a transformed copy of the 25,000-word list from [aparrish/wordfreq-en-25000](https://github.com/aparrish/wordfreq-en-25000), exported by Allison Parrish from [wordfreq](https://github.com/rspeer/wordfreq) by Robyn Speer.

The source list states that this data is available under the [Creative Commons Attribution-ShareAlike 4.0 International license](https://creativecommons.org/licenses/by-sa/4.0/). This project retains the complete source ordering and frequency values. See the upstream projects for their full attribution notes and documentation.

The upstream source notes that it intentionally makes no attempt to filter offensive or inappropriate words.

## IPA pronunciation data

`public/data/phonetics.json` is a transformed subset of the [CMU Pronouncing Dictionary](https://github.com/cmusphinx/cmudict), Copyright (C) 1993–2015 Carnegie Mellon University. It is converted from ARPABET to US English IPA locally and may include multiple pronunciation variants. The CMUdict BSD-style license is preserved in [CMUDICT-LICENSE](./CMUDICT-LICENSE).

## Chinese translations

`public/data/translations.json` is a transformed subset of the [ECDICT English-Chinese Dictionary](https://github.com/skywind3000/ECDICT), Copyright (c) 2025 Linwei. It retains Chinese translation lines only for words in this project's source frequency list. The ECDICT MIT License is preserved in [ECDICT-LICENSE](./ECDICT-LICENSE).
