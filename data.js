/* ==========================================================================
   data.js — HoldTheCameraa
   --------------------------------------------------------------------------
   ALL COPY IN THIS FILE IS PLACEHOLDER. Project titles, clients, crew names,
   the email address and the social handles are invented for layout purposes
   and must be replaced before this goes near a commissioner.

   Every image spot is a picsum seed. In the DOM each one is marked with
   <!-- swap: /assets/... --> immediately before the tag that uses it.
   ========================================================================== */

window.HTC = (function () {
  'use strict';

  /* --- 8. project copy -----------------------------------------------------
     Shape required by the brief: { slug, title, client, year, role, credits, stills }
     `credits` is an array of [role, name] pairs. `stills` is 9 alt strings;
     the seed for plate n of project <slug> is `<slug>-<nn>`.
  ------------------------------------------------------------------------- */
  var projects = [
    {
      slug: 'pe-drum',
      title: 'PE DRUM',
      client: 'Nord Tapes',
      year: 2026,
      role: 'direction, camera, edit',
      format: 'music video / 3:48 / 16mm and digital',
      logline: 'a band drives east until the road stops being asphalt. one take per village, no second chances.',
      credits: [
        ['written & directed by', 'HoldTheCameraa'],
        ['director of photography', 'HoldTheCameraa'],
        ['producer', 'Ilinca Vrabie'],
        ['1st assistant camera', 'Radu Chiriac'],
        ['gaffer', 'Sorin Dobre'],
        ['production design', 'Maria Onea'],
        ['styling', 'Ana Curelaru'],
        ['edit', 'HoldTheCameraa'],
        ['colour', 'Vlad Timofte'],
        ['sound', 'Elena Bejan'],
        ['shot in', 'Dorohoi, Vorona, Botosani']
      ],
      stills: [
        'the van on the shoulder of the road, headlights in the rain',
        'the singer in the passenger seat with the window down',
        'a bus shelter under one sodium lamp',
        'hands winding a cassette back with a pen',
        'wet asphalt with no centre line left on it',
        'the drummer asleep against a fogged window',
        'a dog crossing the road at first light',
        'the band eating standing up outside a closed shop',
        'brake lights as the van leaves the frame'
      ]
    },
    {
      slug: 'sase-dimineata',
      title: 'SASE DIMINEATA',
      client: 'Prut Film',
      year: 2025,
      role: 'direction, camera',
      format: 'short film / 11:20 / digital',
      logline: 'one hour in a house before anybody speaks. the mother leaves first, the boy counts the stairs.',
      credits: [
        ['directed by', 'HoldTheCameraa'],
        ['director of photography', 'Cosmin Ursache'],
        ['producer', 'Dana Melinte'],
        ['1st assistant director', 'Tudor Apostol'],
        ['production design', 'Irina Sofronie'],
        ['edit', 'HoldTheCameraa'],
        ['sound design', 'Bogdan Nichita'],
        ['colour', 'Vlad Timofte'],
        ['cast', 'Livia Prodan, Mihnea Racovita']
      ],
      stills: [
        'a kitchen at six in the morning with one bulb on',
        'a woman putting on a coat without looking up',
        'steam on the window above the sink',
        'the yard gate left open, snow not cleared',
        'a boy waiting on the stairs with his bag already on',
        'the bus stop seen from across the road',
        'her hands on the wheel of a car that is not moving',
        'a school corridor before anyone arrives',
        'the same kitchen, empty, with the light left on'
      ]
    },
    {
      slug: 'fabrica-14',
      title: 'FABRICA 14',
      client: 'Uzina Botosani',
      year: 2025,
      role: 'direction, camera, edit',
      format: 'brand film / 2:10 / digital',
      logline: 'a factory that has run without stopping since 1974, shot across one shift and one fog.',
      credits: [
        ['directed by', 'HoldTheCameraa'],
        ['director of photography', 'HoldTheCameraa'],
        ['executive producer', 'Oana Zaharia'],
        ['production manager', 'Ilinca Vrabie'],
        ['gaffer', 'Sorin Dobre'],
        ['high speed unit', 'Radu Chiriac'],
        ['edit', 'HoldTheCameraa'],
        ['colour', 'Vlad Timofte'],
        ['music', 'Nord Tapes']
      ],
      stills: [
        'the shop floor before the shift, lights coming up in banks',
        'a lathe operator setting a piece by hand',
        'sparks off a grinder, shot at 120 frames',
        'the foreman reading the board with his coat still on',
        'gloves left on a bench, still shaped like hands',
        'a crate of finished parts under plastic sheet',
        'the yard in fog with the loading bay open',
        'a woman on break at the window',
        'the gate closing behind the last truck'
      ]
    },
    {
      slug: 'iarna-la-doi',
      title: 'IARNA LA DOI',
      client: 'Casa Jderi',
      year: 2024,
      role: 'direction, edit',
      format: 'music video / 4:02 / digital',
      logline: 'two people and one radiator. january in a block of flats, filmed in four nights.',
      credits: [
        ['directed by', 'HoldTheCameraa'],
        ['director of photography', 'Cosmin Ursache'],
        ['producer', 'Dana Melinte'],
        ['gaffer', 'Andrei Postolache'],
        ['styling', 'Ana Curelaru'],
        ['edit', 'HoldTheCameraa'],
        ['colour', 'Vlad Timofte'],
        ['artist', 'Casa Jderi']
      ],
      stills: [
        'two people on a balcony in january',
        'a hand clearing frost from the inside of the glass',
        'the flat lit only by the television',
        'the corridor of a block of flats, third floor',
        'snow falling past a stairwell window',
        'a cigarette shared on the landing',
        'the singer against a bare wall',
        'wet boots left at the door',
        'the balcony in the morning with nobody on it'
      ]
    },
    {
      slug: 'apa-mare',
      title: 'APA MARE',
      client: 'Mareea',
      year: 2024,
      role: 'camera',
      format: 'commercial / 0:45 / digital',
      logline: 'cold open water at five in the morning. the product arrives in the last eight seconds.',
      credits: [
        ['directed by', 'Mihnea Racovita'],
        ['director of photography', 'HoldTheCameraa'],
        ['producer', 'Oana Zaharia'],
        ['1st assistant camera', 'Radu Chiriac'],
        ['gaffer', 'Sorin Dobre'],
        ['art direction', 'Irina Sofronie'],
        ['edit', 'Tudor Apostol'],
        ['colour', 'Vlad Timofte']
      ],
      stills: [
        'a swimmer entering flat water before sunrise',
        'the bottle standing on wet stone under one light',
        'reflected water moving across a ceiling',
        'a towel over a shoulder with steam coming off it',
        'the lake from the shore with nobody in it',
        'a hand breaking the surface from underneath',
        'the shot list taped to the inside of the boat',
        'the crew on the pontoon at five in the morning',
        'the last swim of the day, backlit'
      ]
    },
    {
      slug: 'nord',
      title: 'NORD',
      client: 'self released',
      year: 2023,
      role: 'direction, camera, edit',
      format: 'documentary / 24:00 / digital',
      logline: 'eleven villages north of dorohoi, filmed over two winters. nobody is asked to repeat anything.',
      credits: [
        ['directed by', 'HoldTheCameraa'],
        ['director of photography', 'HoldTheCameraa'],
        ['edit', 'HoldTheCameraa'],
        ['sound recordist', 'Elena Bejan'],
        ['sound design', 'Bogdan Nichita'],
        ['colour', 'Vlad Timofte'],
        ['with', 'the people of eleven villages']
      ],
      stills: [
        'a road sign for the border that has been repainted twice',
        'a man holding a photograph of a house that is gone',
        'a village hall with the chairs stacked against the wall',
        'the bus that comes twice a week, arriving',
        'a field with the crop already cut',
        'the inside of a shop that sells three things',
        'two women talking over a fence',
        'the church at the top of the village',
        'the road out, at dusk'
      ]
    }
  ];

  /* --- 6.3 hero subtitle track. four lines, hard cut, 4.2s ---------------- */
  var subtitles = [
    'we shoot until the light goes.',
    'nobody here is acting.',
    'he says it again, quieter.',
    'the town is asleep by nine.'
  ];

  /* --- 6.8 collage chapter, blue ballpoint on squared paper --------------- */
  var collage = [
    'day 4. rain again. we keep it.',
    'no lights. just the window.',
    'first take was the take.'
  ];

  /* --- 6.9 about ---------------------------------------------------------- */
  var about = {
    name: 'HOLDTHECAMERAA',
    strip: 'visual artist since 2019 — Dorohoi, RO',
    signature: '8:46 (self portrait)',
    body: [
      'i direct, shoot and cut. mostly alone, sometimes with two people and a car.',
      'i started in 2019 with a borrowed camera and a town that is quiet after nine. the light here is bad for eight months of the year, which turns out to be useful.',
      'i work out of dorohoi and travel for anything worth the drive. music video, short film, brand work, and photography between all of it.',
      'i prefer one long take to four short ones. i keep the first take more often than i should.'
    ],
    /* pen annotations, ref 9. each draws a curved arrow toward the portrait */
    notes: [
      { text: '1072 x 1290 (1217kb)', x: 3, y: -8, rot: -2, arrow: 'down' },
      { text: 'contact: mail@holdthecameraa.com', x: 48, y: -8, rot: -1, arrow: 'down' },
      { text: 'roll 03 / frame 21', x: -2, y: 58, rot: 3, arrow: 'up' },
      { text: 'do not crop this one', x: 56, y: 84, rot: 2, arrow: 'left' }
    ],
    /* 01-08. real chapters, so the numbering is earned. */
    contents: [
      ['01', 'the reel', '#/'],
      ['02', 'credits', '#/!credits'],
      ['03', 'film index', '#/!index'],
      ['04', 'notebook', '#/!notebook'],
      ['05', 'stills', '#/!stills'],
      ['06', 'prints', '#/!prints'],
      ['07', 'dossier', '#/about'],
      ['08', 'postcard', '#/contact']
    ]
  };

  /* --- 6.10 contact. PLACEHOLDER addresses ------------------------------- */
  var links = [
    { label: 'EMAIL', href: 'mailto:mail@holdthecameraa.com' },
    { label: 'INSTAGRAM', href: 'https://instagram.com/holdthecameraa' },
    { label: 'VIMEO', href: 'https://vimeo.com/holdthecameraa' },
    { label: 'TELEGRAM', href: 'https://t.me/holdthecameraa' }
  ];

  /* --- 7.13 velocity ticker ---------------------------------------------- */
  var marquee = 'AVAILABLE FOR COMMISSION 2026 — DOROHOI, ROMANIA — 16MM AND DIGITAL — WILL TRAVEL — WRITE FIRST, BRIEF LATER — ';

  /* --- 6.6 / #/stills. 24 plates, filterable by year --------------------- */
  var stills = [
    { y: 2026, a: 'a field of pylons in flat morning light' },
    { y: 2026, a: 'a woman on a station platform with her back to the camera' },
    { y: 2026, a: 'four chairs stacked outside a closed bar' },
    { y: 2026, a: 'headlights through a hedge' },
    { y: 2026, a: 'a swimming pool drained for the winter' },
    { y: 2026, a: 'a hand on a car roof, rain starting' },
    { y: 2025, a: 'a block of flats with two windows lit' },
    { y: 2025, a: 'a dog asleep in a doorway at noon' },
    { y: 2025, a: 'wet tarmac reflecting a petrol station sign' },
    { y: 2025, a: 'a boy carrying a chair across a yard' },
    { y: 2025, a: 'washing on a line in fog' },
    { y: 2025, a: 'the back of a bus at a level crossing' },
    { y: 2024, a: 'a market stall packing up in the dark' },
    { y: 2024, a: 'two men looking into an engine bay' },
    { y: 2024, a: 'a curtain moving in an open window' },
    { y: 2024, a: 'a cemetery wall with snow on top of it' },
    { y: 2024, a: 'a girl on a bicycle in the middle of the road' },
    { y: 2024, a: 'the last light on a grain silo' },
    { y: 2023, a: 'a kitchen table with one plate on it' },
    { y: 2023, a: 'a bus shelter with the glass gone' },
    { y: 2023, a: 'a horse standing in a ploughed field' },
    { y: 2023, a: 'a barber shop lit from inside at dusk' },
    { y: 2023, a: 'three coats on one hook' },
    { y: 2023, a: 'the road out of town, taken from a moving car' }
  ];

  return {
    projects: projects,
    subtitles: subtitles,
    collage: collage,
    about: about,
    links: links,
    marquee: marquee,
    stills: stills,
    years: [2019, 2026],
    place: 'Dorohoi, RO'
  };
})();
