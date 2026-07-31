import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Début du nettoyage complet de la base de données…');

  // 1. Nettoyage (ordre = enfants avant parents, pour respecter les contraintes de clés étrangères)
  await prisma.challengeSubmission.deleteMany({});
  await prisma.challenge.deleteMany({});
  await prisma.hackathon.deleteMany({});
  await prisma.activityReport.deleteMany({});
  await prisma.membershipCensus.deleteMany({});
  await prisma.assignedActivity.deleteMany({});
  await prisma.certificate.deleteMany({});
  await prisma.treasuryTransaction.deleteMany({});
  await prisma.treasuryAccount.deleteMany({});
  await prisma.supportOffer.deleteMany({});
  await prisma.socialAccount.deleteMany({});
  await prisma.countryPost.deleteMany({});
  await prisma.universityPost.deleteMany({});
  
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
  console.log('✅ Base entièrement nettoyée.');

  // 2. Création du Pays Unique (Bénin)
  console.log('Création du pays unique : Bénin…');
  const benin = await prisma.country.create({
    data: { name: 'Bénin' },
  });

  // 3. Création de l'Université Unique (Université d'Abomey-Calavi - UAC)
  console.log("Création de l'université unique : Université d'Abomey-Calavi (UAC)…");
  const uac = await prisma.university.create({
    data: {
      name: "Université d'Abomey-Calavi (UAC)",
      countryId: benin.id,
    },
  });

  // 4. Création de la branche académique (EPAC)
  const branchEpac = await prisma.branch.create({
    data: {
      name: "École Polytechnique d'Abomey-Calavi (EPAC)",
      universityId: uac.id,
    },
  });

  // Initialisation de la trésorerie UAC
  await prisma.treasuryAccount.create({
    data: {
      universityId: uac.id,
      balance: 0,
    },
  });

  // Mot de passe commun pour les profils de démonstration
  const passwordHash = await bcrypt.hash('SecurePassword123!', 10);

  // 5. Création de l'Admin Unique
  console.log("Création du compte Administrateur unique…");
  const admin = await prisma.member.create({
    data: {
      firstname: 'Super',
      lastname: 'Admin',
      email: 'admin@fieri.com',
      password: passwordHash,
      role: 'ADMIN',
      branchId: branchEpac.id,
      bio: 'Super Administrateur National FIERI Bénin',
      skills: ['Gouvernance', 'Management', 'Système FIERI'],
    },
  });

  // 6. Création des 6 Clubs, 6 Responsables, 6 Chercheurs et 6 Projets
  console.log("Création des 6 clubs avec leurs responsables, chercheurs et projets…");

  const clubDefs = [
    {
      id: 'club-devweb',
      name: 'Pôle Développement Web & Cloud',
      discipline: 'Informatique',
      description: 'Développement d’applications web modernes, API REST, cloud architecture et logiciels open-source.',
      resp: {
        firstname: 'Marc',
        lastname: 'KPOHOUN',
        email: 'resp.devweb@fieri.com',
        bio: 'Responsable du Pôle Dev Web & Cloud - UAC EPAC.',
        skills: ['React', 'Node.js', 'NestJS', 'Docker'],
      },
      chercheur: {
        firstname: 'Ablawa',
        lastname: 'DOSSOU',
        email: 'chercheur.devweb@fieri.com',
        bio: 'Étudiante chercheuse en architectures distribuées et micro-frontend.',
        skills: ['TypeScript', 'GraphQL', 'WebAssembly'],
      },
      project: {
        id: 'proj-devweb',
        title: 'Plateforme Open-Source FIERI Hub Bénin',
        summary: 'Portail numérique d’interconnexion des clubs scientifiques et technologiques du Bénin.',
        description: 'Développement d’une plateforme centralisée pour la gouvernance des clubs, la gestion des projets étudiants et la publication des travaux de recherche.',
        technologies: ['React', 'Node.js', 'PostgreSQL', 'TailwindCSS'],
      },
    },
    {
      id: 'club-ia',
      name: 'Pôle Intelligence Artificielle',
      discipline: 'IA & Data Science',
      description: 'Recherche et développement en vision par ordinateur, traitement du langage naturel et modèles prédictifs.',
      resp: {
        firstname: 'Kévin',
        lastname: 'HOUESSOU',
        email: 'resp.ia@fieri.com',
        bio: 'Responsable du Pôle Intelligence Artificielle - UAC EPAC.',
        skills: ['Python', 'PyTorch', 'Computer Vision', 'Deep Learning'],
      },
      chercheur: {
        firstname: 'Sèna',
        lastname: 'GBAHOUN',
        email: 'chercheur.ia@fieri.com',
        bio: 'Étudiant chercheur en apprentissage profond appliqué à l’agriculture tropicale.',
        skills: ['TensorFlow', 'CNN', 'Data Mining'],
      },
      project: {
        id: 'proj-ia',
        title: 'AgriVision IA - Diagnostic Pathologique des Cultures',
        summary: 'Système d’intelligence artificielle pour la détection précoce des maladies foliaires du maïs et manioc.',
        description: 'Déploiement d’un modèle de vision par ordinateur embarqué sur terminal mobile permettant un diagnostic instantané des cultures au champ.',
        technologies: ['PyTorch', 'FastAPI', 'OpenCV', 'MobileNet'],
      },
    },
    {
      id: 'club-ros',
      name: 'Pôle Robotique & ROS',
      discipline: 'Robotique',
      description: 'Systèmes embarqués autonomes, cinématique, simulation Gazebo et middleware ROS 2.',
      resp: {
        firstname: 'Arnaud',
        lastname: 'TCHIBOZO',
        email: 'resp.ros@fieri.com',
        bio: 'Responsable du Pôle Robotique & ROS - UAC EPAC.',
        skills: ['ROS 2', 'C++', 'Gazebo', 'SLAM', 'Navigation2'],
      },
      chercheur: {
        firstname: 'Fifi',
        lastname: 'ADANLE',
        email: 'chercheur.ros@fieri.com',
        bio: 'Étudiante chercheuse en navigation autonome de rovers terrestres sous ROS 2.',
        skills: ['LiDAR', 'Python', 'Control Systems'],
      },
      project: {
        id: 'proj-ros',
        title: 'AgroRover - Robot Mobile Autonome sous ROS 2',
        summary: 'Rover tout-terrain pour la cartographie parcellaire et la surveillance autonome des récoltes.',
        description: 'Robot mobile doté de capteurs LiDAR et caméras stéréo, guidé par la stack ROS 2 Navigation pour surveiller l’état sanitaire des plantations.',
        technologies: ['ROS 2', 'C++', 'Python', 'Gazebo', 'LiDAR'],
      },
    },
    {
      id: 'club-electronique',
      name: 'Pôle Électronique Embarquée',
      discipline: 'Électronique',
      description: 'Conception de cartes électroniques (PCB), microcontrôleurs, capteurs IoT et énergie renouvelable.',
      resp: {
        firstname: 'Rodrigue',
        lastname: 'AGBOSSA',
        email: 'resp.electronique@fieri.com',
        bio: 'Responsable du Pôle Électronique Embarquée - UAC EPAC.',
        skills: ['KiCAD', 'STM32', 'ESP32', 'IoT', 'LoRaWAN'],
      },
      chercheur: {
        firstname: 'Pascal',
        lastname: 'BOKO',
        email: 'chercheur.electronique@fieri.com',
        bio: 'Étudiant chercheur en micro-capteurs environnementaux à très faible consommation.',
        skills: ['Arduino', 'C Embarqué', 'PCB Design'],
      },
      project: {
        id: 'proj-electronique',
        title: 'Station Météo IoT & Réseau de Capteurs LoRaWAN',
        summary: 'Station météorologique autonome en énergie avec transmission de données sans fil longue portée.',
        description: 'Dispositif autonome mesurant la température, pluviométrie, hygro-sol et radiation solaire avec transmission vers un dashboard cloud via LoRaWAN.',
        technologies: ['ESP32', 'LoRaWAN', 'KiCAD', 'Solar Power'],
      },
    },
    {
      id: 'club-btp',
      name: 'Pôle Bâtiment & Travaux Publics',
      discipline: 'Génie Civil',
      description: 'Modélisation des structures, matériaux de construction écologiques locaux et maquettes numériques BIM.',
      resp: {
        firstname: 'Gérard',
        lastname: 'MENSAH',
        email: 'resp.btp@fieri.com',
        bio: 'Responsable du Pôle BTP - UAC EPAC.',
        skills: ['Revit', 'AutoCAD', 'BIM', 'Eurocodes', 'Matériaux locaux'],
      },
      chercheur: {
        firstname: 'Pierrette',
        lastname: 'HOUNTONDJI',
        email: 'chercheur.btp@fieri.com',
        bio: 'Étudiante chercheuse en briques de terre compressée stabilisées au liant végétal.',
        skills: ['Calcul de Structure', 'Éco-matériaux', 'Robot Structural Analysis'],
      },
      project: {
        id: 'proj-btp',
        title: 'EcoBéton Bénin - Structures en Matériaux Biosourcés',
        summary: 'Formulation et caractérisation mécanique de bétons biosourcés à partir d’argiles et fibres locales.',
        description: 'Recherche appliquée visant à réduire l’empreinte carbone du secteur de la construction au Bénin via l’utilisation de matériaux locaux performants.',
        technologies: ['Revit BIM', 'RDM', 'Tests Mécaniques', 'Argile Stabilisée'],
      },
    },
    {
      id: 'club-froid',
      name: 'Pôle Froid & Climatisation',
      discipline: 'Génie Thermique',
      description: 'Systèmes de réfrigération, thermodynamique appliquée et installations de climatisation éco-énergétiques.',
      resp: {
        firstname: 'Honoré',
        lastname: 'ZANNOU',
        email: 'resp.froid@fieri.com',
        bio: 'Responsable du Pôle Froid & Climatisation - UAC EPAC.',
        skills: ['Thermodynamique', 'Fluides Frigorigènes', 'Froid Solaire', 'HVAC'],
      },
      chercheur: {
        firstname: 'Colette',
        lastname: 'SOGLO',
        email: 'chercheur.froid@fieri.com',
        bio: 'Étudiante chercheuse en machines frigorifiques à absorption solaire.',
        skills: ['Climatisation Solaire', 'Audits Énergétiques', 'Chambres Froides'],
      },
      project: {
        id: 'proj-froid',
        title: 'Chambre Froide Solaire Autonome (ThermoSolar)',
        summary: 'Unité mobile de conservation frigorifique à énergie solaire pour les coopératives maraîchères.',
        description: 'Conception d’un conteneur frigorifique autonome fonctionnant à l’énergie solaire photovoltaïque et au stockage thermique par changement de phase.',
        technologies: ['Froid Solaire', 'Polyuréthane', 'Bilan Thermique', 'Automate PLC'],
      },
    },
  ];

  for (const def of clubDefs) {
    // 6.1. Création du Club
    const club = await prisma.club.create({
      data: {
        id: def.id,
        name: def.name,
        discipline: def.discipline,
        description: def.description,
      },
    });

    // 6.2. Création du Responsable du Club
    const respUser = await prisma.member.create({
      data: {
        firstname: def.resp.firstname,
        lastname: def.resp.lastname,
        email: def.resp.email,
        password: passwordHash,
        role: 'RESPONSABLE',
        branchId: branchEpac.id,
        bio: def.resp.bio,
        skills: def.resp.skills,
      },
    });

    // Lier le responsable au Club
    await prisma.club.update({
      where: { id: club.id },
      data: { responsibleId: respUser.id },
    });

    // Adhésion du Responsable
    await prisma.clubMembership.create({
      data: {
        clubId: club.id,
        memberId: respUser.id,
        status: 'APPROVED',
        role: 'RESPONSABLE',
      },
    });

    // 6.3. Création de l'Étudiant Chercheur
    const chercheurUser = await prisma.member.create({
      data: {
        firstname: def.chercheur.firstname,
        lastname: def.chercheur.lastname,
        email: def.chercheur.email,
        password: passwordHash,
        role: 'CHERCHEUR',
        branchId: branchEpac.id,
        bio: def.chercheur.bio,
        skills: def.chercheur.skills,
      },
    });

    // Adhésion du Chercheur
    await prisma.clubMembership.create({
      data: {
        clubId: club.id,
        memberId: chercheurUser.id,
        status: 'APPROVED',
        role: 'MEMBRE',
      },
    });

    // 6.4. Création du Projet Unique du Club
    await prisma.project.create({
      data: {
        id: def.project.id,
        title: def.project.title,
        summary: def.project.summary,
        description: def.project.description,
        status: 'Actif',
        technologies: def.project.technologies,
        clubId: club.id,
        ownerId: respUser.id,
        team: [
          { name: `${def.resp.firstname} ${def.resp.lastname}`, role: 'Chef de Pôle' },
          { name: `${def.chercheur.firstname} ${def.chercheur.lastname}`, role: 'Chercheur Référent' },
        ],
      },
    });
  }

  console.log('\n======================================================');
  console.log('✅ REINITIALISATION EFFECTUEE AVEC SUCCES POUR LE JURY');
  console.log('======================================================');
  console.log(' Données chargées dans l\'environnement :');
  console.log('  • Pays (1) : Bénin');
  console.log('  • Université (1) : Université d\'Abomey-Calavi (UAC)');
  console.log('  • Admin (1) : admin@fieri.com (Mot de passe: SecurePassword123!)');
  console.log('  • Clubs (6) : Dev Web, IA, ROS, Électronique, BTP, Froid & Climatisation');
  console.log('  • Responsables de club (6) : resp.devweb@fieri.com, resp.ia@fieri.com, etc.');
  console.log('  • Étudiants Chercheurs (6) : chercheur.devweb@fieri.com, chercheur.ia@fieri.com, etc.');
  console.log('  • Projets (6) : 1 projet actif par club (proj-devweb, proj-ia, etc.)');
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error('Erreur lors du seeding :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
