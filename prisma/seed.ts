import 'dotenv/config'; // charge backend_fieri/.env (DATABASE_URL) quelle que soit l'invocation
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// FIERI — Jeu de données de démonstration (« mock » persisté en base réelle).
//
// Structure demandée :
//   • 2 pays, chacun avec 2 universités (4 universités au total)
//   • 1 université avec 4 clubs (UAC) + 1 université avec 2 clubs (UCAD)  → 6 clubs
//   • 3 étudiants par club                                                → 18 étudiants
//   • 1 RESPONSABLE de pôle SANS club
//   • 1 étudiant CHERCHEUR SANS club
//   • 1 ADMIN (portée globale — voir note ci-dessous)
//   • des opportunités de Stage et de Travail (CDD R&D / Doctorat / Partenaire)
//   • 6 travaux de recherche (Projects) + 6 articles (Publications)
//   • 5 formations (Workshops, exposées aussi via /formations)
//   • 4 actualités (News) + 4 événements (Events)
//
// NOTE « admin sans université » : le schéma impose `Member.branchId` (non nul) ;
// un membre ne peut donc pas exister hors structure académique. L'ADMIN est ici
// rattaché nominalement à une branche mais sa portée est globale (rôle ADMIN) —
// c'est le rôle, pas la branche, qui définit son périmètre.
//
// NOTE « club ↔ université » : le modèle Club ne porte pas de `universityId`.
// L'appartenance d'un club à une université est matérialisée par la branche des
// étudiants qui le composent (tous les membres d'un club pointent vers la même
// université). L'API /clubs reste inchangée.
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Début du seeding…');

  // 1. Nettoyage (ordre = enfants avant parents, pour respecter les FK)
  await prisma.application.deleteMany({});
  await prisma.opportunity.deleteMany({});
  await prisma.badge.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.contactMessage.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.news.deleteMany({});
  await prisma.eventRegistration.deleteMany({});
  await prisma.workshopRegistration.deleteMany({});
  await prisma.clubMembership.deleteMany({});
  await prisma.projectContribution.deleteMany({});
  await prisma.projectFollow.deleteMany({});
  await prisma.researcherFollow.deleteMany({});
  await prisma.publication.deleteMany({});
  await prisma.contribution.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.workshop.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.club.deleteMany({});
  await prisma.member.deleteMany({});
  await prisma.branch.deleteMany({});
  await prisma.university.deleteMany({});
  await prisma.country.deleteMany({});
  console.log('Base nettoyée.');

  // 2. Pays (2)
  const benin = await prisma.country.create({ data: { name: 'Bénin' } });
  const senegal = await prisma.country.create({ data: { name: 'Sénégal' } });

  // 3. Universités (2 par pays → 4)
  const uac = await prisma.university.create({
    data: { name: "Université d'Abomey-Calavi", countryId: benin.id },
  });
  const up = await prisma.university.create({
    data: { name: 'Université de Parakou', countryId: benin.id },
  });
  const ucad = await prisma.university.create({
    data: { name: 'Université Cheikh Anta Diop', countryId: senegal.id },
  });
  const ugb = await prisma.university.create({
    data: { name: 'Université Gaston Berger', countryId: senegal.id },
  });

  // 4. Branches (1 par université — indispensable : tout Member y est rattaché)
  const brUac = await prisma.branch.create({
    data: { name: 'EPAC — Génie Informatique & Télécoms', universityId: uac.id },
  });
  const brUp = await prisma.branch.create({
    data: { name: 'Faculté des Sciences & Techniques', universityId: up.id },
  });
  const brUcad = await prisma.branch.create({
    data: { name: 'École Supérieure Polytechnique', universityId: ucad.id },
  });
  const brUgb = await prisma.branch.create({
    data: { name: 'UFR Sciences Appliquées & Technologie', universityId: ugb.id },
  });
  console.log('Pays, universités et branches créés.');

  // Mot de passe commun à tous les comptes de démo.
  const password = await bcrypt.hash('SecurePassword123!', 10);

  // 5. Clubs + étudiants (UAC : 4 clubs / UCAD : 2 clubs, 3 étudiants chacun)
  const clubBlueprints = [
    // ── Université d'Abomey-Calavi (Bénin) — 4 clubs ─────────────────────────
    {
      id: 'club-robotique',
      name: 'Pôle Robotique & IA',
      discipline: 'Ingénierie',
      description:
        'Robotique mobile, vision par ordinateur et systèmes autonomes.',
      branchId: brUac.id,
      responsible: { firstname: 'Paul', lastname: 'Adjahoui', email: 'resp.robotique@fieri.com', skills: ['Robotique', 'ROS2', 'Leadership'] },
      students: [
        { firstname: 'Aurel', lastname: 'Sossou', email: 'aurel.sossou@fieri.com', skills: ['ROS2', 'C++', 'SLAM'] },
        { firstname: 'Fatima', lastname: 'Bello', email: 'fatima.bello@fieri.com', skills: ['Python', 'OpenCV', 'PyTorch'] },
        { firstname: 'Kevin', lastname: 'Ahoué', email: 'kevin.ahoue@fieri.com', skills: ['Arduino', 'Systèmes embarqués'] },
      ],
    },
    {
      id: 'club-bio',
      name: 'Pôle Biotechnologies',
      discipline: 'Biologie',
      description: 'Génomique, bio-informatique et biotechnologies appliquées.',
      branchId: brUac.id,
      responsible: { firstname: 'Marie', lastname: 'Gnonlonfoun', email: 'resp.bio@fieri.com', skills: ['Génomique', 'Management', 'Encadrement'] },
      students: [
        { firstname: 'Chloé', lastname: 'Dossou', email: 'chloe.dossou@fieri.com', skills: ['Biologie moléculaire', 'R'] },
        { firstname: 'Ibrahim', lastname: 'Touré', email: 'ibrahim.toure@fieri.com', skills: ['Génomique', 'Python'] },
        { firstname: 'Nadia', lastname: 'Agbodjan', email: 'nadia.agbodjan@fieri.com', skills: ['Bio-informatique', 'Statistiques'] },
      ],
    },
    {
      id: 'club-energie',
      name: 'Pôle Énergies Renouvelables',
      discipline: 'Énergie',
      description: 'Micro-grids solaires et gestion intelligente de l\'énergie.',
      branchId: brUac.id,
      responsible: { firstname: 'Éric', lastname: 'Tossou', email: 'resp.energie@fieri.com', skills: ['Énergie', 'Gestion de projet', 'Leadership'] },
      students: [
        { firstname: 'Yann', lastname: 'Koudoro', email: 'yann.koudoro@fieri.com', skills: ['Électrotechnique', 'MATLAB'] },
        { firstname: 'Aïcha', lastname: 'Diallo', email: 'aicha.diallo@fieri.com', skills: ['Photovoltaïque', 'IoT'] },
        { firstname: 'Marc', lastname: 'Zinsou', email: 'marc.zinsou@fieri.com', skills: ['Power Systems', 'Simulation'] },
      ],
    },
    {
      id: 'club-data',
      name: 'Pôle Data Science',
      discipline: 'Informatique',
      description: 'Machine learning, big data et science des données appliquée.',
      branchId: brUac.id,
      responsible: { firstname: 'Rita', lastname: 'Amoussou', email: 'resp.data@fieri.com', skills: ['Data Science', 'Leadership', 'MLOps'] },
      students: [
        { firstname: 'Sarah', lastname: 'Adjovi', email: 'sarah.adjovi@fieri.com', skills: ['Pandas', 'scikit-learn', 'SQL'] },
        { firstname: 'David', lastname: 'Houngbo', email: 'david.houngbo@fieri.com', skills: ['Spark', 'Data Engineering'] },
        { firstname: 'Leïla', lastname: 'Bakary', email: 'leila.bakary@fieri.com', skills: ['NLP', 'TensorFlow'] },
      ],
    },
    // ── Université Cheikh Anta Diop (Sénégal) — 2 clubs ──────────────────────
    {
      id: 'club-agri',
      name: 'Pôle AgriTech',
      discipline: 'Agronomie',
      description: 'Agriculture de précision et détection des maladies des plantes.',
      branchId: brUcad.id,
      responsible: { firstname: 'Modou', lastname: 'Gueye', email: 'resp.agri@fieri.com', skills: ['AgriTech', 'Management', 'IoT'] },
      students: [
        { firstname: 'Moussa', lastname: 'Ndiaye', email: 'moussa.ndiaye@fieri.com', skills: ['Drones', 'Computer Vision'] },
        { firstname: 'Awa', lastname: 'Sarr', email: 'awa.sarr@fieri.com', skills: ['Agronomie', 'Data'] },
        { firstname: 'Ousmane', lastname: 'Fall', email: 'ousmane.fall@fieri.com', skills: ['IoT', 'Capteurs'] },
      ],
    },
    {
      id: 'club-sante',
      name: 'Pôle e-Santé',
      discipline: 'Santé',
      description: 'Télémédecine, imagerie médicale et IA pour le diagnostic.',
      branchId: brUcad.id,
      responsible: { firstname: 'Aminata', lastname: 'Diouf', email: 'resp.sante@fieri.com', skills: ['e-Santé', 'Leadership', 'Imagerie'] },
      students: [
        { firstname: 'Fatou', lastname: 'Ba', email: 'fatou.ba@fieri.com', skills: ['Imagerie médicale', 'Deep Learning'] },
        { firstname: 'Cheikh', lastname: 'Diop', email: 'cheikh.diop@fieri.com', skills: ['Signal', 'Python'] },
        { firstname: 'Mariama', lastname: 'Sow', email: 'mariama.sow@fieri.com', skills: ['Santé publique', 'Statistiques'] },
      ],
    },
  ];

  const studentsByClub: Record<string, { id: number; firstname: string; lastname: string }[]> = {};
  const allStudents: { id: number; firstname: string; lastname: string }[] = [];

  for (const bp of clubBlueprints) {
    // Responsable du club (créé avant le club pour pouvoir l'y lier via responsibleId).
    const resp = await prisma.member.create({
      data: {
        firstname: bp.responsible.firstname,
        lastname: bp.responsible.lastname,
        email: bp.responsible.email,
        password,
        branchId: bp.branchId,
        role: 'RESPONSABLE',
        bio: `Responsable du ${bp.name}.`,
        skills: bp.responsible.skills,
      },
    });

    const club = await prisma.club.create({
      data: {
        id: bp.id,
        name: bp.name,
        discipline: bp.discipline,
        description: bp.description,
        responsibleId: resp.id,
      },
    });

    // Le responsable est aussi membre approuvé de son propre club.
    await prisma.clubMembership.create({
      data: { clubId: club.id, memberId: resp.id, status: 'APPROVED' },
    });

    const created: { id: number; firstname: string; lastname: string }[] = [];
    for (const s of bp.students) {
      const member = await prisma.member.create({
        data: {
          firstname: s.firstname,
          lastname: s.lastname,
          email: s.email,
          password,
          branchId: bp.branchId,
          role: 'ETUDIANT',
          bio: `Étudiant·e chercheur·se membre du ${bp.name}.`,
          skills: s.skills,
        },
      });
      await prisma.clubMembership.create({
        data: { clubId: club.id, memberId: member.id, status: 'APPROVED' },
      });
      created.push(member);
      allStudents.push(member);
    }
    studentsByClub[bp.id] = created;
  }
  console.log(`Clubs (${clubBlueprints.length}), responsables de club (${clubBlueprints.length}) et étudiants (${allStudents.length}) créés.`);

  // 6. Membres « à part » ─────────────────────────────────────────────────────
  // Responsable de pôle SANS club (aucune ClubMembership créée pour lui).
  const responsable = await prisma.member.create({
    data: {
      firstname: 'Jean',
      lastname: 'Dupont',
      email: 'responsable@fieri.com',
      password,
      branchId: brUac.id,
      role: 'RESPONSABLE',
      bio: 'Responsable de pôle — non rattaché à un club pour le moment.',
      skills: ['Leadership', 'Gestion de projet', 'Mentorat'],
    },
  });

  // Étudiant CHERCHEUR SANS club.
  const chercheur = await prisma.member.create({
    data: {
      firstname: 'Alexandre',
      lastname: 'Vidal',
      email: 'candidat@fieri.com',
      password,
      branchId: brUcad.id,
      role: 'CHERCHEUR',
      bio: 'Étudiant chercheur indépendant, non affilié à un club.',
      skills: ['Vision artificielle', 'Deep Learning', 'PyTorch'],
      distinctions: ["Prix de l'Innovation 2025"],
    },
  });

  // ADMIN — portée globale (rattachement de branche nominal, cf. note en tête).
  const admin = await prisma.member.create({
    data: {
      firstname: 'Super',
      lastname: 'Admin',
      email: 'admin@fieri.com',
      password,
      branchId: brUac.id,
      role: 'ADMIN',
      bio: 'Administrateur de la plateforme FIERI (périmètre global, hors université).',
      skills: ['NestJS', 'Prisma', 'PostgreSQL'],
    },
  });
  console.log('Responsable (sans club), chercheur (sans club) et admin créés.');

  // 7. Projets — 6 « travaux de recherche », 1 par club ────────────────────────
  const projectsSeed = [
    {
      id: 'proj-101',
      clubId: 'club-robotique',
      title: 'Navigation Autonome par LiDAR',
      summary: 'Fusion LiDAR + caméra pour la navigation de robots mobiles.',
      description:
        "Conception d'un pipeline de navigation autonome combinant SLAM et évitement d'obstacles en milieu encombré.",
      status: 'Actif',
      stars: 24,
      budgetRaised: 4200,
      technologies: ['ROS2', 'C++', 'LiDAR', 'Python'],
    },
    {
      id: 'proj-102',
      clubId: 'club-bio',
      title: 'Séquençage génomique low-cost',
      summary: 'Plateforme de bio-informatique pour le séquençage abordable.',
      description:
        'Pipeline open-source d\'assemblage et d\'annotation de génomes optimisé pour du matériel à faible coût.',
      status: 'Actif',
      stars: 15,
      budgetRaised: 2800,
      technologies: ['Python', 'Nextflow', 'Docker'],
    },
    {
      id: 'proj-103',
      clubId: 'club-energie',
      title: 'Micro-grid solaire intelligent',
      summary: 'Optimisation temps réel d\'un réseau électrique solaire.',
      description:
        "Gestion dynamique de la production et du stockage d'énergie solaire pour zones rurales non connectées.",
      status: 'Actif',
      stars: 31,
      budgetRaised: 6500,
      technologies: ['IoT', 'MATLAB', 'Python', 'MPPT'],
    },
    {
      id: 'proj-104',
      clubId: 'club-data',
      title: 'Détection de fraude par ML',
      summary: 'Modèles de détection d\'anomalies sur transactions mobiles.',
      description:
        "Système de scoring en temps réel des transactions de mobile money à partir d'algorithmes d'apprentissage.",
      status: 'Terminé',
      stars: 42,
      budgetRaised: 3100,
      technologies: ['scikit-learn', 'XGBoost', 'Kafka'],
    },
    {
      id: 'proj-105',
      clubId: 'club-agri',
      title: 'Diagnostic des maladies des plantes par IA',
      summary: 'Reconnaissance d\'images pour la santé des cultures.',
      description:
        "Application mobile de détection précoce des maladies foliaires à partir de photos prises au champ.",
      status: 'Actif',
      stars: 28,
      budgetRaised: 3900,
      technologies: ['TensorFlow', 'Computer Vision', 'Flutter'],
    },
    {
      id: 'proj-106',
      clubId: 'club-sante',
      title: 'Télé-radiologie assistée',
      summary: 'IA d\'aide au diagnostic pour l\'imagerie médicale.',
      description:
        "Plateforme de télé-expertise permettant le pré-tri des radiographies pulmonaires par un modèle de vision.",
      status: 'Actif',
      stars: 19,
      budgetRaised: 5200,
      technologies: ['PyTorch', 'DICOM', 'FastAPI'],
    },
  ];

  for (const p of projectsSeed) {
    const owner = studentsByClub[p.clubId][0];
    const second = studentsByClub[p.clubId][1];
    await prisma.project.create({
      data: {
        id: p.id,
        title: p.title,
        summary: p.summary,
        description: p.description,
        status: p.status,
        stars: p.stars,
        budgetRaised: p.budgetRaised,
        technologies: p.technologies,
        clubId: p.clubId,
        ownerId: owner.id,
        team: [
          { name: `${owner.firstname} ${owner.lastname}`, role: 'Chercheur Principal' },
          { name: `${second.firstname} ${second.lastname}`, role: 'Contributeur' },
        ],
      },
    });
    // Le porteur suit son propre projet (favori).
    await prisma.projectFollow.create({
      data: { memberId: owner.id, projectId: p.id },
    });
  }
  console.log(`Projets (${projectsSeed.length}) créés.`);

  // 8. Publications — 6 « articles de recherche », 1 par projet ────────────────
  const publicationsSeed = [
    { title: 'Optimisation de trajectoires LiDAR en environnement dense', category: 'Robotique', clubId: 'club-robotique', projectId: 'proj-101' },
    { title: 'Assemblage de génomes sur matériel contraint', category: 'Biotechnologies', clubId: 'club-bio', projectId: 'proj-102' },
    { title: 'Pilotage prédictif des micro-grids solaires', category: 'Énergie', clubId: 'club-energie', projectId: 'proj-103' },
    { title: 'Détection d\'anomalies temps réel dans le mobile money', category: 'Data Science', clubId: 'club-data', projectId: 'proj-104' },
    { title: 'CNN légers pour la phytopathologie de terrain', category: 'AgriTech', clubId: 'club-agri', projectId: 'proj-105' },
    { title: 'Pré-tri automatisé des radiographies pulmonaires', category: 'e-Santé', clubId: 'club-sante', projectId: 'proj-106' },
  ];

  for (const pub of publicationsSeed) {
    const author = studentsByClub[pub.clubId][0];
    await prisma.publication.create({
      data: {
        title: pub.title,
        content:
          'Résumé : cet article présente la méthodologie, les résultats expérimentaux et les perspectives du travail de recherche associé.',
        category: pub.category,
        status: 'PUBLISHED',
        authorId: author.id,
        clubId: pub.clubId,
        projectId: pub.projectId,
      },
    });
  }
  console.log(`Publications (${publicationsSeed.length}) créées.`);

  // 9. Formations (Workshops) — 5 ─────────────────────────────────────────────
  const workshopsSeed = [
    { id: 'work-101', title: 'Introduction à ROS2 et SLAM', instructor: 'Dr. John Kane', capacity: 20 },
    { id: 'work-102', title: 'Deep Learning pratique avec PyTorch', instructor: 'Dr. Awa Ndoye', capacity: 25 },
    { id: 'work-103', title: 'Data Engineering avec Spark', instructor: 'Ir. David Houngbo', capacity: 18 },
    { id: 'work-104', title: 'Énergie solaire : dimensionnement de micro-grids', instructor: 'Dr. Marc Zinsou', capacity: 15 },
    { id: 'work-105', title: 'Bio-informatique pour débutants', instructor: 'Dr. Chloé Dossou', capacity: 1 }, // capacité réduite → démo file d'attente
  ];
  for (const w of workshopsSeed) {
    await prisma.workshop.create({ data: w });
  }
  console.log(`Formations (${workshopsSeed.length}) créées.`);

  // 10. Événements — 4 ─────────────────────────────────────────────────────────
  const eventsSeed = [
    { id: 'event-101', title: 'Symposium Africain sur l\'IA 2026', date: new Date('2026-08-15T09:00:00Z'), isLive: false, streamUrl: 'https://live.fieri.org/symposium2026' },
    { id: 'event-102', title: 'Hackathon AgriTech Dakar', date: new Date('2026-09-05T08:00:00Z'), isLive: false, streamUrl: 'https://live.fieri.org/hackathon-agritech' },
    { id: 'event-103', title: 'Webinaire : Robotique mobile en Afrique', date: new Date('2026-07-12T15:00:00Z'), isLive: true, streamUrl: 'https://live.fieri.org/webinaire-robotique' },
    { id: 'event-104', title: 'Forum Énergies Renouvelables', date: new Date('2026-11-20T09:30:00Z'), isLive: false, streamUrl: 'https://live.fieri.org/forum-energie' },
  ];
  for (const ev of eventsSeed) {
    await prisma.event.create({ data: ev });
  }
  console.log(`Événements (${eventsSeed.length}) créés.`);

  // 11. Actualités (News) — 4 (toutes APPROVED pour être visibles) ─────────────
  const newsSeed = [
    { id: 'news-101', title: 'Optimisation des micro-grids solaires', content: 'Les réseaux électriques intelligents permettent une gestion dynamique de l\'énergie renouvelable en zone rurale.', category: 'Énergie', authorId: allStudents[6].id },
    { id: 'news-102', title: 'Une IA béninoise détecte les maladies du manioc', content: 'Le Pôle AgriTech dévoile un modèle de vision embarqué capable d\'identifier les maladies foliaires en temps réel.', category: 'AgriTech', authorId: allStudents[12].id },
    { id: 'news-103', title: 'La robotique mobile en plein essor à l\'UAC', content: 'Le Pôle Robotique & IA présente son robot de navigation autonome basé sur la fusion LiDAR-caméra.', category: 'Robotique', authorId: allStudents[0].id },
    { id: 'news-104', title: 'e-Santé : le télé-diagnostic gagne du terrain', content: 'La télé-radiologie assistée par IA améliore l\'accès au diagnostic dans les zones sous-équipées.', category: 'e-Santé', authorId: chercheur.id },
  ];
  for (const n of newsSeed) {
    await prisma.news.create({ data: { ...n, status: 'APPROVED' } });
  }
  console.log(`Actualités (${newsSeed.length}) créées.`);

  // 12. Opportunités — stages, emplois (CDD R&D), doctorat, partenaire ─────────
  const opportunitiesSeed = [
    { id: 'opp-201', title: 'Stage R&D Vision par Ordinateur', type: 'Stage de Recherche', discipline: 'IA / Vision', salary: 600, authorId: responsable.id, description: 'Fusion de données caméra et LiDAR pour la détection d\'obstacles. Stage de 6 mois au Pôle Robotique.' },
    { id: 'opp-202', title: 'Stage Bio-informatique', type: 'Stage de Recherche', discipline: 'Biotechnologies', salary: 500, authorId: chercheur.id, description: 'Développement d\'un pipeline d\'annotation génomique. Stage de fin d\'études, 5 mois.' },
    { id: 'opp-203', title: 'Ingénieur R&D Énergies Renouvelables', type: 'CDD R&D', discipline: 'Énergie', salary: 1800, authorId: responsable.id, description: 'Conception et supervision de micro-grids solaires intelligents. Contrat R&D de 12 mois.' },
    { id: 'opp-204', title: 'Data Scientist — Détection de fraude', type: 'CDD R&D', discipline: 'Data Science', salary: 2000, authorId: admin.id, description: 'Industrialisation de modèles de détection d\'anomalies sur transactions mobiles.' },
    { id: 'opp-205', title: 'Doctorat en Robotique Mobile', type: 'Doctorat', discipline: 'Robotique', salary: 2100, authorId: chercheur.id, description: 'Sujet : planification de trajectoires optimales en milieu encombré. Bourse doctorale de 3 ans.' },
    { id: 'opp-206', title: 'Programme Partenaire — Google Research Africa', type: 'Exclusivités Partenaires', discipline: 'IA', salary: null, authorId: admin.id, description: 'Accès exclusif au programme de mentorat et de financement de notre partenaire.' },
  ];
  for (const o of opportunitiesSeed) {
    await prisma.opportunity.create({ data: { ...o, status: 'Active' } });
  }
  console.log(`Opportunités (${opportunitiesSeed.length}) créées.`);

  console.log('\nSeeding terminé avec succès ! ✅');
  console.log('Comptes de démo (mot de passe : SecurePassword123!) :');
  console.log('  • admin@fieri.com        → ADMIN');
  console.log('  • responsable@fieri.com  → RESPONSABLE (sans club)');
  console.log('  • resp.<club>@fieri.com  → RESPONSABLE (1 par club : robotique, bio, energie, data, agri, sante)');
  console.log('  • candidat@fieri.com     → CHERCHEUR (sans club)');
  console.log('  • aurel.sossou@fieri.com → ETUDIANT (Pôle Robotique & IA)  … + 17 autres étudiants');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
