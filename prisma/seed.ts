import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Début du nettoyage de la base de données…');

  // 1. Nettoyage (ordre = enfants avant parents, pour respecter les clés étrangères)
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
  console.log('Base nettoyée.');

  // 2. Création des pays
  console.log('Création des pays…');
  const benin = await prisma.country.create({ data: { name: 'Bénin' } });
  const senegal = await prisma.country.create({ data: { name: 'Sénégal' } });

  // 3. Création des universités
  console.log('Création des universités…');
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

  // 4. Création des branches
  console.log('Création des branches…');
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

  // 5. Création de l'administrateur par défaut
  console.log("Création de l'administrateur par défaut…");
  const password = await bcrypt.hash('SecurePassword123!', 10);
  const admin = await prisma.member.create({
    data: {
      firstname: 'Super',
      lastname: 'Admin',
      email: 'admin@fieri.com',
      password,
      branchId: brUac.id,
      role: 'ADMIN',
      bio: 'Administrateur de la plateforme FIERI (périmètre global).',
      skills: ['NestJS', 'Prisma', 'PostgreSQL'],
    },
  });

  // 6. Création des clubs (sans responsable initial)
  console.log('Création des clubs…');
  const clubs = [
    {
      id: 'club-robotique',
      name: 'Pôle Robotique & IA',
      discipline: 'Ingénierie',
      description: 'Robotique mobile, vision par ordinateur et systèmes autonomes.',
    },
    {
      id: 'club-bio',
      name: 'Pôle Biotechnologies',
      discipline: 'Biologie',
      description: 'Génomique, bio-informatique et biotechnologies appliquées.',
    },
    {
      id: 'club-energie',
      name: 'Pôle Énergies Renouvelables',
      discipline: 'Énergie',
      description: "Micro-grids solaires et gestion intelligente de l'énergie.",
    },
    {
      id: 'club-data',
      name: 'Pôle Data Science',
      discipline: 'Informatique',
      description: 'Machine learning, big data et science des données appliquée.',
    },
    {
      id: 'club-agri',
      name: 'Pôle AgriTech',
      discipline: 'Agronomie',
      description: 'Agriculture de précision et détection des maladies des plantes.',
    },
    {
      id: 'club-sante',
      name: 'Pôle e-Santé',
      discipline: 'Santé',
      description: 'Télémédecine, imagerie médicale et IA pour le diagnostic.',
    },
  ];

  for (const c of clubs) {
    await prisma.club.create({
      data: c,
    });
  }

  console.log('\nSeeding terminé avec succès ! ✅');
  console.log('Données créées :');
  console.log(`  • Pays : Bénin, Sénégal`);
  console.log(`  • Universités : UAC, UP, UCAD, UGB`);
  console.log(`  • Clubs : ${clubs.map(c => c.name).join(', ')}`);
  console.log('Compte Administrateur de test :');
  console.log('  • Email    : admin@fieri.com');
  console.log('  • Password : SecurePassword123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
