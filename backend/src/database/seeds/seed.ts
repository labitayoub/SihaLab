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
      {
        email: 'admin@sihatilab.com',
        password: await bcrypt.hash('admin123', 10),
        role: UserRole.ADMIN,
        firstName: 'Admin',
        lastName: 'System',
        emailVerified: true,
        isActive: true,
      },
      {
        email: 'dr.alami@sihatilab.com',
        password: await bcrypt.hash('doctor123', 10),
        role: UserRole.MEDECIN,
        firstName: 'Mohammed',
        lastName: 'Alami',
        specialite: 'Cardiologie',
        numeroOrdre: 'M12345',
        phone: '0612345678',
        emailVerified: true,
        isActive: true,
      },
      {
        email: 'dr.bennani@sihatilab.com',
        password: await bcrypt.hash('doctor123', 10),
        role: UserRole.MEDECIN,
        firstName: 'Fatima',
        lastName: 'Bennani',
        specialite: 'Pédiatrie',
        numeroOrdre: 'M67890',
        phone: '0623456789',
        emailVerified: true,
        isActive: true,
      },
      {
        email: 'patient@sihatilab.com',
        password: await bcrypt.hash('patient123', 10),
        role: UserRole.PATIENT,
        firstName: 'Fatima',
        lastName: 'Zahra',
        phone: '0634567890',
        address: '123 Rue Mohammed V, Casablanca',
        emailVerified: true,
        isActive: true,
      },
      {
        email: 'patient2@sihatilab.com',
        password: await bcrypt.hash('patient123', 10),
        role: UserRole.PATIENT,
        firstName: 'Ahmed',
        lastName: 'Idrissi',
        phone: '0645678901',
        address: '456 Avenue Hassan II, Rabat',
        emailVerified: true,
        isActive: true,
      },
      {
        email: 'pharmacie@sihatilab.com',
        password: await bcrypt.hash('pharma123', 10),
        role: UserRole.PHARMACIEN,
        firstName: 'Pharmacie',
        lastName: 'Centrale',
        numeroOrdre: 'P67890',
        phone: '0656789012',
        address: '789 Boulevard Zerktouni, Casablanca',
        emailVerified: true,
        isActive: true,
      },
      {
        email: 'labo@sihatilab.com',
        password: await bcrypt.hash('labo123', 10),
        role: UserRole.LABORATOIRE,
        firstName: 'Laboratoire',
        lastName: 'Medical',
        phone: '0667890123',
        address: '321 Rue Allal Ben Abdellah, Rabat',
        emailVerified: true,
        isActive: true,
      },
      {
        email: 'infirmier@sihatilab.com',
        password: await bcrypt.hash('nurse123', 10),
        role: UserRole.INFIRMIER,
        firstName: 'Karim',
        lastName: 'Tazi',
        phone: '0678901234',
        emailVerified: true,
        isActive: true,
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
