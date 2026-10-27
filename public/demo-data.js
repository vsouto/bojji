// Sample content for the public demo. Nothing here is saved.
export function demoItems({ iso, ago }) {
  return [
    { id: 't1', type: 'task', title: 'Renew passport photos', due: iso(-1), done: false, body: 'The place on Rua Augusta closes at 6.', tags: ['Personal'] },
    { id: 't2', type: 'task', title: 'Pay the electricity bill', due: iso(0), done: false, body: '', tags: ['Home'] },
    { id: 't3', type: 'task', title: 'Call Mum about Sunday lunch', due: iso(0), done: false, body: 'Ask if we should bring dessert.', tags: ['Personal'] },
    { id: 't4', type: 'task', title: 'Book the dentist', due: iso(3), done: false, body: '', tags: ['Personal'] },
    { id: 't5', type: 'task', title: 'Return the library books', due: iso(4), done: false, body: '' },
    { id: 't9', type: 'task', title: 'Pick up the dry cleaning', due: iso(1), done: false, body: '', tags: ['Home'] },
    { id: 't6', type: 'task', title: 'Cancel the Evernote subscription', due: null, done: false, body: 'Export everything first.', tags: ['Personal'] },
    { id: 't7', type: 'task', title: 'Water the plants', due: iso(-2), done: true, body: '' },
    { id: 't8', type: 'task', title: 'Send the rent receipt', due: iso(-3), done: true, body: '' },
    { id: 's1', type: 'task', title: 'Ask legal about the Siemens NDA', due: iso(-1), done: false, body: '', tags: ['Siemens'] },
    { id: 's2', type: 'task', title: 'Prepare the workshop demo', due: iso(1), done: false, body: 'Use the staging data set, not production.', tags: ['Siemens'] },
    { id: 's3', type: 'task', title: 'Send the Q4 proposal', due: iso(2), done: false, body: '', tags: ['Siemens', 'Proposals'] },
    { id: 's4', type: 'task', title: 'Share the kickoff notes with the team', due: null, done: false, body: '', tags: ['Siemens'] },
    { id: 's5', type: 'task', title: 'Draft the kickoff agenda', due: iso(-4), done: true, body: '', tags: ['Siemens'] },
    { id: 's6', type: 'note', title: 'Siemens kickoff', edited: ago(90), body: 'Attendees: Marta (procurement), Jonas (plant IT), me.\n\n## Decisions\n- Pilot starts in the Lisbon plant\n- Weekly check-in on Thursdays\n\n## Open questions\n- Who signs off on data access?\n- Budget for the second phase', tags: ['Siemens'] },
    { id: 'n1', type: 'note', title: 'Weekend in Porto', edited: ago(14), body: 'Train leaves at 8:12 from Santa Apolónia.\n\n## To see\n- Livraria Lello (book tickets ahead)\n- Ribeira at sunset\n- Serralves gardens\n\n## To eat\n- Francesinha at Café Santiago\n- Pastéis at Manteigaria', tags: ['Personal', 'Travel'] },
    { id: 'n2', type: 'note', title: 'Reading list', edited: ago(60 * 26), body: '- Four Thousand Weeks, Oliver Burkeman\n- The Overstory, Richard Powers\n- Klara and the Sun, Kazuo Ishiguro\n\nFinished: Tomorrow, and Tomorrow, and Tomorrow.' },
    { id: 'n3', type: 'note', title: 'Gift ideas', edited: ago(60 * 24 * 5), body: 'Ana: a good chef\'s knife, or the ceramics class she mentioned.\nDad: new reading glasses case, the leather one.\nLeo: Lego Botanicals.' },
    { id: 'n4', type: 'note', title: 'Kitchen measurements', edited: ago(60 * 24 * 12), body: 'Wall by the window: 2.41 m\nUnder the counter: 61 cm deep, 85 cm high\nFridge gap: 60 × 185 cm', tags: ['Home'] },
  ];
}
