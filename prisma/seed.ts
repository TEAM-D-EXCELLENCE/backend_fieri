import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Début du seeding...');

  // 1. Nettoyer la base de données
  // (L'ordre est important pour respecter les contraintes d'intégrité référentielle)
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
  await prisma.event.deleteMany({});
  await prisma.workshop.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.club.deleteMany({});
  await prisma.member.deleteMany({});
  await prisma.branch.deleteMany({});
  await prisma.university.deleteMany({});
  await prisma.country.deleteMany({});

  // 2. Créer les entités géographiques et académiques
  const benin = await prisma.country.create({
    data: { name: 'Bénin' },
  });

  const uac = await prisma.university.create({
    data: {
      name: 'Université d\'Abomey-Calavi',
      countryId: benin.id,
    },
  });

  const branchCalavi = await prisma.branch.create({
    data: {
      name: 'Calavi Campus',
      universityId: uac.id,
    },
  });

  // 3. Créer des membres avec différents rôles
  const salt = 10;
  const passwordHash = await bcrypt.hash('SecurePassword123!', salt);

  // Chercheur standard
  const researcher = await prisma.member.create({
    data: {
      firstname: 'Alexandre',
      lastname: 'Vidal',
      email: 'candidat@fieri.com',
      password: passwordHash,
      branchId: branchCalavi.id,
      role: 'CHERCHEUR',
      bio: 'Expert en vision artificielle et Robotique Autonome.',
      skills: ['Python', 'OpenCV', 'ROS2', 'C++'],
      distinctions: ['Prix de l\'Innovation 2025'],
    },
  });

  // Chef de projet
  const pm = await prisma.member.create({
    data: {
      firstname: 'Sarah',
      lastname: 'Koffi',
      email: 'chef@fieri.com',
      password: passwordHash,
      branchId: branchCalavi.id,
      role: 'CHEF_DE_PROJET',
      bio: 'Chef de projet IA & Robotique.',
      skills: ['Project Management', 'Agile', 'Scrum', 'Python'],
    },
  });

  // Responsable de pôle / club
  const lead = await prisma.member.create({
    data: {
      firstname: 'Jean',
      lastname: 'Dupont',
      email: 'responsable@fieri.com',
      password: passwordHash,
      branchId: branchCalavi.id,
      role: 'RESPONSABLE',
      bio: 'Responsable du pôle Robotique.',
      skills: ['ROS2', 'SLAM', 'Embedded Systems'],
    },
  });

  // Administrateur
  const admin = await prisma.member.create({
    data: {
      firstname: 'Super',
      lastname: 'Admin',
      email: 'admin@fieri.com',
      password: passwordHash,
      branchId: branchCalavi.id,
      role: 'ADMIN',
      bio: 'Administrateur de la plateforme FIERI Research.',
      skills: ['System', 'Database', 'NestJS', 'Prisma'],
    },
  });

  // Mentor
  const mentor = await prisma.member.create({
    data: {
      firstname: 'Dr. John',
      lastname: 'Kane',
      email: 'mentor@fieri.com',
      password: passwordHash,
      branchId: branchCalavi.id,
      role: 'MENTOR',
      bio: 'Enseignant chercheur et Mentor en IA.',
      skills: ['Research', 'Deep Learning', 'PyTorch'],
    },
  });

  console.log('Membres créés.');

  // 4. Créer des clubs (pôles)
  const clubRobotique = await prisma.club.create({
    data: {
      id: 'club-1',
      name: 'Pôle Robotique & IA',
      discipline: 'Ingénierie',
      description: 'Pôle d\'excellence sur la robotique mobile et la vision par ordinateur.',
    },
  });

  const clubBio = await prisma.club.create({
    data: {
      id: 'club-2',
      name: 'Pôle Biotechnologies',
      discipline: 'Biologie',
      description: 'Recherches sur la génomique et les bio-technologies appliquées.',
    },
  });

  // Inscriptions de club
  await prisma.clubMembership.create({
    data: {
      clubId: clubRobotique.id,
      memberId: researcher.id,
      status: 'APPROVED',
    },
  });

  await prisma.clubMembership.create({
    data: {
      clubId: clubRobotique.id,
      memberId: pm.id,
      status: 'APPROVED',
    },
  });

  console.log('Clubs et adhésions créés.');

  // 5. Créer des projets
  const projLidar = await prisma.project.create({
    data: {
      id: 'proj-101',
      title: 'Navigation Autonome par LiDAR',
      summary: 'Optimisation des trajectoires de robots mobiles avec LiDAR.',
      description: 'Ce projet vise à concevoir un algorithme de navigation autonome basé sur la fusion de capteurs LiDAR et caméras.',
      status: 'Actif',
      stars: 1,
      budgetRaised: 4200,
      technologies: ['ROS2', 'C++', 'LiDAR', 'Python'],
      clubId: clubRobotique.id,
      ownerId: researcher.id,
      team: JSON.stringify([
        { name: 'Alexandre Vidal', role: 'Chercheur Principal' },
        { name: 'Sarah Koffi', role: 'Chef de projet' },
      ]),
    },
  });

  await prisma.projectFollow.create({
    data: {
      memberId: researcher.id,
      projectId: projLidar.id,
    },
  });

  console.log('Projets créés.');

  // 6. Créer des ateliers (workshops)
  const workshopRos = await prisma.workshop.create({
    data: {
      id: 'work-101',
      title: 'Introduction à ROS2 et SLAM',
      instructor: 'Dr. John Kane',
      capacity: 20,
    },
  });

  const workshopIa = await prisma.workshop.create({
    data: {
      id: 'work-102',
      title: 'Deep Learning Pratique avec PyTorch',
      instructor: 'Dr. John Kane',
      capacity: 1, // Capacité ultra-réduite pour tester la file d'attente
    },
  });

  console.log('Ateliers créés.');

  // 7. Créer des événements
  await prisma.event.create({
    data: {
      id: 'event-101',
      title: 'Symposium Africain sur l\'IA 2026',
      date: new Date('2026-07-15T09:00:00Z'),
      isLive: false,
      streamUrl: 'https://live.fieri.org/symposium2026',
    },
  });

  console.log('Événements créés.');

  // 8. Créer des news
  await prisma.news.create({
    data: {
      id: 'news-101',
      title: 'Optimisation des micro-grids',
      content: 'Les réseaux électriques intelligents (micro-grids) permettent une gestion dynamique de l\'énergie renouvelable.',
      category: 'Énergie',
      status: 'APPROVED',
      authorId: researcher.id,
    },
  });

  await prisma.news.create({
    data: {
      id: 'news-102',
      title: 'Progrès en Fusion Nucléaire',
      content: 'Des chercheurs rapportent une avancée majeure dans le confinement magnétique du plasma.',
      category: 'Physique',
      status: 'PENDING',
      authorId: researcher.id,
    },
  });

  console.log('News créées.');

  // 9. Créer des tâches
  await prisma.task.create({
    data: {
      id: 'task-101',
      projectId: projLidar.id,
      title: 'Intégration du LiDAR',
      status: 'TODO',
      priority: 'HIGH',
      assignedTo: 'Alexandre Vidal',
    },
  });

  console.log('Tâches créées.');

  // 10. Créer des badges
  await prisma.badge.create({
    data: {
      id: 'badge-101',
      userId: researcher.id,
      badgeType: 'CONTRIBUTOR_GOLD',
      userName: 'Alexandre Vidal',
      awardedBy: 'Conseil Scientifique',
    },
  });

  console.log('Badges créés.');

  // 11. Créer des opportunités
  await prisma.opportunity.create({
    data: {
      id: 'opp-201',
      title: 'Doctorat en Robotique Mobile',
      description: 'Sujet : Planification de trajectoires optimales en milieu encombré.',
      type: 'Doctorat',
      discipline: 'Robotique',
      salary: 2100,
      status: 'Active',
      authorId: lead.id,
    },
  });

  await prisma.opportunity.create({
    data: {
      id: 'opp-202',
      title: 'Stage R&D Vision par Ordinateur',
      description: 'Fusion de données caméra et lidar pour détection d\'obstacles.',
      type: 'Stage',
      discipline: 'IA / Vision',
      salary: 600,
      status: 'Active',
      authorId: researcher.id,
    },
  });

  console.log('Opportunités créées.');

  console.log('Seeding terminé avec succès !');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
