import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../entities/user.entity';
import { UserRole } from '../../common/enums/role.enum';

const dataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'postgres',
  database: 'sihatilab',
  entities: [User],
  synchronize: false,
});

async function seed() {
  await dataSource.initialize();
  const userRepository = dataSource.getRepository(User);

  const users = [
    {
      email: 'admin@sihatilab.com',
      password: await bcrypt.hash('admin123', 10),
      role: UserRole.ADMIN,
      firstName: 'Admin',
      lastName: 'System',
      emailVerified: true,
    },
    {
      email: 'dr.alami@sihatilab.com',
      password: await bcrypt.hash('doctor123', 10),
      role: UserRole.MEDECIN,
      firstName: 'Mohammed',
      lastName: 'Alami',
      specialite: 'Cardiologie',
      numeroOrdre: 'M12345',
      emailVerified: true,
    },
    {
      email: 'patient@sihatilab.com',
      password: await bcrypt.hash('patient123', 10),
      role: UserRole.PATIENT,
      firstName: 'Fatima',
      lastName: 'Zahra',
      phone: '0612345678',
      emailVerified: true,
    },
    {
      email: 'pharmacie@sihatilab.com',
      password: await bcrypt.hash('pharma123', 10),
      role: UserRole.PHARMACIEN,
      firstName: 'Pharmacie',
      lastName: 'Centrale',
      numeroOrdre: 'P67890',
      emailVerified: true,
    },
    {
      email: 'labo@sihatilab.com',
      password: await bcrypt.hash('labo123', 10),
      role: UserRole.LABORATOIRE,
      firstName: 'Laboratoire',
      lastName: 'Medical',
      emailVerified: true,
    },
  ];

  for (const userData of users) {
    const existing = await userRepository.findOne({ where: { email: userData.email } });
    if (!existing) {
      const user = userRepository.create(userData);
      await userRepository.save(user);
      console.log(`✓ Created user: ${userData.email}`);
    }
  }

  console.log('✅ Seed completed!');
  await dataSource.destroy();
}

seed().catch(console.error);
