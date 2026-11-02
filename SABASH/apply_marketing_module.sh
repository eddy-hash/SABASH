#!/bin/bash
set -e
cd ~/SaaS/SABASH

echo "🗄️ 1. Adding Field Visits to Database..."
# Append to init.sql
cat << 'EOT' >> database/init.sql

CREATE TABLE marketing_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES users(id),
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    workplace VARCHAR(150) NOT NULL,
    comments TEXT,
    visit_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
EOT

# Apply to the running database immediately (No data loss)
sudo docker exec -i sabash_db psql -U postgres -d sabash_cargo -c "
CREATE TABLE IF NOT EXISTS marketing_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES users(id),
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    workplace VARCHAR(150) NOT NULL,
    comments TEXT,
    visit_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);" || true

echo "⚙️ 2. Creating NestJS Backend Module..."
mkdir -p backend/src/visits

# Entity
cat << 'EOT' > backend/src/visits/visit.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('marketing_visits')
export class Visit {
  @PrimaryGeneratedColumn('uuid') id: string;
  
  @Column({ name: 'agent_id' }) agentId: string;
  
  @ManyToOne(() => User)
  @JoinColumn({ name: 'agent_id' })
  agent: User;

  @Column({ name: 'customer_name' }) customerName: string;
  @Column({ name: 'customer_phone' }) customerPhone: string;
  @Column() workplace: string;
  @Column('text', { nullable: true }) comments: string;
  @CreateDateColumn({ name: 'visit_date' }) visitDate: Date;
}
EOT

# Service
cat << 'EOT' > backend/src/visits/visits.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Visit } from './visit.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class VisitsService {
  constructor(
    @InjectRepository(Visit) private visitRepo: Repository<Visit>,
    private notificationService: NotificationsService,
  ) {}

  async findAll(): Promise<Visit[]> {
    return this.visitRepo.find({ relations: ['agent'], order: { visitDate: 'DESC' } });
  }

  async create(data: Partial<Visit>, agentId: string): Promise<Visit> {
    const visit = this.visitRepo.create({ ...data, agentId });
    const saved = await this.visitRepo.save(visit);

    await this.notificationService.create({
      userId: agentId,
      title: 'Field Visit Logged',
      message: 'Recorded visit to ' + saved.workplace + ' (' + saved.customerName + ')'
    });

    return saved;
  }
}
EOT

# Controller
cat << 'EOT' > backend/src/visits/visits.controller.ts
import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { VisitsService } from './visits.service';
import { Visit } from './visit.entity';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/auth.guard';

@Controller('visits')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @Get()
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  findAll(): Promise<Visit[]> {
    return this.visitsService.findAll();
  }

  @Post()
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  create(@Body() createVisitDto: Partial<Visit>, @Req() req: any): Promise<Visit> {
    return this.visitsService.create(createVisitDto, req.user.userId);
  }
}
EOT

# Module
cat << 'EOT' > backend/src/visits/visits.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisitsController } from './visits.controller';
import { VisitsService } from './visits.service';
import { Visit } from './visit.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([Visit]), NotificationsModule],
  controllers: [VisitsController],
  providers: [VisitsService],
})
export class VisitsModule {}
EOT

# Register in AppModule
node -e "
const fs = require('fs');
const path = 'backend/src/app.module.ts';
let content = fs.readFileSync(path, 'utf8');
if (!content.includes('VisitsModule')) {
  content = content.replace('import { NotificationsModule }', 'import { VisitsModule } from \"./visits/visits.module\";\nimport { NotificationsModule }');
  content = content.replace('NotificationsModule,', 'NotificationsModule,\n    VisitsModule,');
  fs.writeFileSync(path, content);
}
"

echo "🎨 3. Updating Frontend Sidebar & Translations..."
# Add translations
node -e "
const fs = require('fs');
const langs = ['en', 'sw', 'zh', 'tr'];
const labels = {
  en: { nav: 'Field Visits', title: 'Marketing & Field Visits', register: 'Log New Visit', customer: 'Customer Name', phone: 'Phone Number', workplace: 'Workplace (Shop/Office)', comments: 'Comments (Maelezo ya Mteja)', save: 'Save Visit', agent: 'Marketer', date: 'Date', noVisits: 'No visits logged yet.', success: 'Visit recorded successfully!' },
  sw: { nav: 'Ziara za Masoko', title: 'Masoko na Ziara', register: 'Rekodi Ziara Mpya', customer: 'Jina la Mteja', phone: 'Namba ya Simu', workplace: 'Mahali pa Kazi (Duka/Ofisi)', comments: 'Maelezo ya Mteja', save: 'Hifadhi Ziara', agent: 'Mfanyabiashara', date: 'Tarehe', noVisits: 'Hakuna ziara zilizorekodiwa.', success: 'Ziara imerekodiwa kikamilifu!' },
  zh: { nav: '实地拜访', title: '营销与实地拜访', register: '记录新拜访', customer: '客户姓名', phone: '电话号码', workplace: '工作地点 (店铺/办公室)', comments: '客户备注', save: '保存拜访', agent: '营销人员', date: '日期', noVisits: '暂无拜访记录。', success: '拜访记录成功！' },
  tr: { nav: 'Saha Ziyaretleri', title: 'Pazarlama ve Saha Ziyaretleri', register: 'Yeni Ziyaret Kaydet', customer: 'Müşteri Adı', phone: 'Telefon Numarası', workplace: 'İş Yeri (Dükkan/Ofis)', comments: 'Müşteri Yorumları', save: 'Ziyareti Kaydet', agent: 'Pazarlamacı', date: 'Tarih', noVisits: 'Henüz ziyaret kaydedilmedi.', success: 'Ziyaret başarıyla kaydedildi!' }
};
langs.forEach(lang => {
  const path = './frontend/src/locales/' + lang + '.json';
  if (fs.existsSync(path)) {
    const data = JSON.parse(fs.readFileSync(path, 'utf8'));
    data.nav.visits = labels[lang].nav;
    data.visits = labels[lang];
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
  }
});
"

# Update Sidebar to include Visits
node -e "
const fs = require('fs');
const path = 'frontend/src/components/Sidebar.tsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace('import { LayoutDashboard, PackagePlus, Users, LogOut, X, Contact } from \"lucide-react\";', 'import { LayoutDashboard, PackagePlus, Users, LogOut, X, Contact, Store } from \"lucide-react\";');
content = content.replace(
  \"{ name: t('nav.users'), icon: Users, path: '/users', roles: ['ADMIN'] },\",
  \"{ name: t('nav.visits'), icon: Store, path: '/visits', roles: ['ADMIN', 'MANAGER', 'STAFF'] },\n    { name: t('nav.users'), icon: Users, path: '/users', roles: ['ADMIN'] },\"
);
fs.writeFileSync(path, content);
"

echo "📱 4. Creating Frontend Visits Pages..."
mkdir -p "frontend/src/app/(protected)/visits/new"

# Visits List Page
cat << 'EOT' > "frontend/src/app/(protected)/visits/page.tsx"
"use client";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Store, Plus, Phone, User as UserIcon, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';

export default function VisitsPage() {
  const { t } = useLanguage();
  const [visits, setVisits] = useState<any[]>([]);

  useEffect(() => {
    const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
    fetch('/api/visits', { headers: { Authorization: 'Bearer ' + token } })
      .then(res => res.json())
      .then(data => setVisits(Array.isArray(data) ? data : []));
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-[#0F3B66]">{t('visits.title')}</h1>
        <Link href="/visits/new" className="w-full sm:w-auto bg-[#FF5722] text-white font-bold py-2.5 px-4 rounded-lg shadow-md hover:bg-orange-600 transition-colors flex justify-center items-center">
          <Plus size={18} className="mr-2" /> {t('visits.register')}
        </Link>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {visits.length === 0 ? (
          <p className="text-center py-6 text-gray-400 bg-gray-50 rounded-lg">{t('visits.noVisits')}</p>
        ) : (
          visits.map(v => (
            <div key={v.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-2">
              <div className="flex justify-between items-start">
                <p className="font-bold text-[#0F3B66] text-lg">{v.customerName}</p>
                <span className="text-xs text-gray-400">{new Date(v.visitDate).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-gray-600 flex items-center"><Store size={14} className="mr-2 text-[#FF5722]"/> {v.workplace}</p>
              <p className="text-sm text-gray-600 flex items-center"><Phone size={14} className="mr-2 text-[#FF5722]"/> {v.customerPhone}</p>
              {v.comments && <p className="text-xs bg-gray-50 p-2 rounded text-gray-600 mt-2">"{v.comments}"</p>}
              <p className="text-xs text-gray-400 pt-2 border-t mt-2 flex items-center"><UserIcon size={12} className="mr-1"/> Agent: {v.agent?.name || 'Unknown'}</p>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm text-left text-gray-600 whitespace-nowrap">
            <thead className="text-xs text-white uppercase bg-[#0F3B66]">
              <tr>
                <th className="px-6 py-4">{t('visits.date')}</th>
                <th className="px-6 py-4">{t('visits.customer')}</th>
                <th className="px-6 py-4">{t('visits.workplace')}</th>
                <th className="px-6 py-4">{t('visits.comments')}</th>
                <th className="px-6 py-4">{t('visits.agent')}</th>
              </tr>
            </thead>
            <tbody>
              {visits.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400 bg-gray-50">{t('visits.noVisits')}</td></tr>
              ) : (
                visits.map((v, i) => (
                  <motion.tr key={v.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 text-xs">{new Date(v.visitDate).toLocaleString()}</td>
                    <td className="px-6 py-4 font-bold text-[#0F3B66]">{v.customerName}<br/><span className="text-xs font-normal text-gray-500">{v.customerPhone}</span></td>
                    <td className="px-6 py-4">{v.workplace}</td>
                    <td className="px-6 py-4 text-xs max-w-xs truncate">{v.comments || '-'}</td>
                    <td className="px-6 py-4 text-xs"><UserIcon size={12} className="inline mr-1"/> {v.agent?.name || 'Unknown'}</td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
EOT

# Visits Form Page
cat << 'EOT' > "frontend/src/app/(protected)/visits/new/page.tsx"
"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowLeft, Save, Store, Phone, User as UserIcon, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';

export default function NewVisitPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [formData, setFormData] = useState({ customerName: '', customerPhone: '', workplace: '', comments: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
    
    try {
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Failed to save visit');
      
      toast.success(t('visits.success'));
      router.push('/visits');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto">
      <div className="flex items-center mb-6">
        <Link href="/visits" className="mr-4 p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors">
          <ArrowLeft size={20} className="text-[#0F3B66]" />
        </Link>
        <h1 className="text-2xl font-bold text-[#0F3B66]">{t('visits.register')}</h1>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100 border-t-4 border-t-[#FF5722]">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">{t('visits.customer')}</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-3.5 text-gray-400" size={18} />
              <input type="text" required value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-[#FF5722] outline-none" placeholder="John Doe" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">{t('visits.phone')}</label>
            <div className="relative">
              <Phone className="absolute left-3 top-3.5 text-gray-400" size={18} />
              <input type="text" required value={formData.customerPhone} onChange={e => setFormData({...formData, customerPhone: e.target.value})} className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-[#FF5722] outline-none" placeholder="+255 7XX XXX XXX" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">{t('visits.workplace')}</label>
            <div className="relative">
              <Store className="absolute left-3 top-3.5 text-gray-400" size={18} />
              <input type="text" required value={formData.workplace} onChange={e => setFormData({...formData, workplace: e.target.value})} className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-[#FF5722] outline-none" placeholder="e.g. Kariakoo Shop No. 45" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">{t('visits.comments')}</label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-3.5 text-gray-400" size={18} />
              <textarea rows={4} value={formData.comments} onChange={e => setFormData({...formData, comments: e.target.value})} className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-[#FF5722] outline-none" placeholder="What did the customer say? Did they show interest?"></textarea>
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="w-full bg-[#FF5722] text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition-colors flex justify-center items-center disabled:opacity-50 mt-4">
            {isLoading ? 'Saving...' : <><Save size={18} className="mr-2"/> {t('visits.save')}</>}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
EOT

echo "🐳 5. Rebuilding Backend and Frontend..."
sudo docker compose build --no-cache backend frontend
sudo docker compose up -d

echo "✅ FIELD VISITS MODULE DEPLOYED!"
