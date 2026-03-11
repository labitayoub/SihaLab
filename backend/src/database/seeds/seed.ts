import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../entities/user.entity';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'sihatilab',
  entities: [User],
  synchronize: true,
});

async function seed() {
  try {
    await dataSource.initialize();
    console.log('✅ Database connected');

    const userRepository = dataSource.getRepository(User);

    const users = [
      // ADMIN
      {
        firstName: 'Admin',
        lastName: 'System',
        email: 'admin@sihatilab.com',
        pays: 'Morocco',
        ville: 'Rabat',
        phone: '+212600000000',
        password: await bcrypt.hash('admin123', 10),
        address: 'Siège SihatiLab',
        role: UserRole.ADMIN,
        emailVerified: true,
        isActive: true,
        avatarUrl: '',
        createdBy: '',
      },
      // MEDECINS
      {
        firstName: 'Mohammed',
        lastName: 'Alami',
        email: 'dr.alami@sihatilab.com',
        pays: 'Morocco',
        ville: 'Rabat',
        phone: '+212612345678',
        password: await bcrypt.hash('doctor123', 10),
        address: 'Centre Médical Hassan, 12 Rue des Hôpitaux',
        specialite: 'Cardiologie',
        numeroOrdre: 'M12345',
        role: UserRole.MEDECIN,
        emailVerified: true,
        isActive: true,
        avatarUrl: '',
        createdBy: '',
      },
      {
        firstName: 'Fatima',
        lastName: 'Bennani',
        email: 'dr.bennani@sihatilab.com',
        pays: 'Morocco',
        ville: 'Casablanca',
        phone: '+212623456789',
        password: await bcrypt.hash('doctor123', 10),
        address: 'Clinique Anfa, 45 Boulevard Anfa',
        specialite: 'Pédiatrie',
        numeroOrdre: 'M67890',
        role: UserRole.MEDECIN,
        emailVerified: true,
        isActive: true,
        avatarUrl: '',
        createdBy: '',
      },
      // PATIENTS
      {
        firstName: 'Fatima',
        lastName: 'Zahra',
        email: 'patient@sihatilab.com',
        pays: 'Morocco',
        ville: 'Casablanca',
        phone: '+212634567890',
        password: await bcrypt.hash('patient123', 10),
        address: '123 Rue Mohammed V',
        role: UserRole.PATIENT,
        emailVerified: true,
        isActive: true,
        avatarUrl: '',
        createdBy: '',
      },
      {
        firstName: 'Ahmed',
        lastName: 'Idrissi',
        email: 'patient2@sihatilab.com',
        pays: 'Morocco',
        ville: 'Rabat',
        phone: '+212645678901',
        password: await bcrypt.hash('patient123', 10),
        address: '456 Avenue Hassan II',
        role: UserRole.PATIENT,
        emailVerified: true,
        isActive: true,
        avatarUrl: '',
        createdBy: '',
      },
      // PHARMACIEN
      {
        firstName: 'Pharmacie',
        lastName: 'Centrale',
        email: 'pharmacie@sihatilab.com',
        pays: 'Morocco',
        ville: 'Casablanca',
        phone: '+212656789012',
        password: await bcrypt.hash('pharma123', 10),
        address: '789 Boulevard Zerktouni',
        specialite: 'Pharmacie Centrale',
        numeroOrdre: 'P67890',
        role: UserRole.PHARMACIEN,
        emailVerified: true,
        isActive: true,
        avatarUrl: '',
        createdBy: '',
      },
      // LABORATOIRE
      {
        firstName: 'Laboratoire',
        lastName: 'Medical',
        email: 'labo@sihatilab.com',
        pays: 'Morocco',
        ville: 'Rabat',
        phone: '+212667890123',
        password: await bcrypt.hash('labo123', 10),
        address: '321 Rue Allal Ben Abdellah',
        specialite: "Laboratoire d'Analyses Médicales",
        role: UserRole.LABORATOIRE,
        emailVerified: true,
        isActive: true,
        avatarUrl: '',
        createdBy: '',
      },
      // INFIRMIER
      {
        firstName: 'Karim',
        lastName: 'Tazi',
        email: 'infirmier@sihatilab.com',
        pays: 'Morocco',
        ville: 'Rabat',
        phone: '+212678901234',
        password: await bcrypt.hash('nurse123', 10),
        address: 'Centre de Soins, Hay Riad',
        role: UserRole.INFIRMIER,
        emailVerified: true,
        isActive: true,
        avatarUrl: '',
        createdBy: '',
      },
    ];

    for (const userData of users) {
      const existing = await userRepository.findOne({
        where: { email: userData.email }
      });

      if (!existing) {
        const user = userRepository.create(userData);
        await userRepository.save(user);
        console.log(`✓ Created user: ${userData.email} (${userData.role})`);
      } else {
        console.log(`⊘ User already exists: ${userData.email}`);
      }
    }

    console.log('');
    console.log('✅ ========================================');
    console.log('✅ Seed completed successfully!');
    console.log('✅ ========================================');
    console.log('');
    console.log('📋 Test Accounts:');
    console.log('');
    console.log('👤 Admin:');
    console.log('   Email: admin@sihatilab.com');
    console.log('   Password: admin123');
    console.log('');
    console.log('👨‍⚕️ Médecins:');
    console.log('   Email: dr.alami@sihatilab.com');
    console.log('   Password: doctor123');
    console.log('   Email: dr.bennani@sihatilab.com');
    console.log('   Password: doctor123');
    console.log('');
    console.log('🧑 Patients:');
    console.log('   Email: patient@sihatilab.com');
    console.log('   Password: patient123');
    console.log('   Email: patient2@sihatilab.com');
    console.log('   Password: patient123');
    console.log('');
    console.log('💊 Pharmacien:');
    console.log('   Email: pharmacie@sihatilab.com');
    console.log('   Password: pharma123');
    console.log('');
    console.log('🔬 Laboratoire:');
    console.log('   Email: labo@sihatilab.com');
    console.log('   Password: labo123');
    console.log('');
    console.log('👨‍⚕️ Infirmier:');
    console.log('   Email: infirmier@sihatilab.com');
    console.log('   Password: nurse123');
    console.log('');

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
}

seed();
