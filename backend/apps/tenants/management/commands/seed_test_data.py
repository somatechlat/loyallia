import random
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from apps.analytics.models import CustomerAnalytics, DailyAnalytics, ProgramAnalytics

# Core
from apps.authentication.models import User, UserRole
from apps.automation.models import Automation

# Billing
from apps.billing.models import Invoice, PaymentMethod, Subscription, SubscriptionStatus

# Loyalty
from apps.cards.models import Card, CardType
from apps.customers.models import Customer, CustomerPass

# Engagement
from apps.notifications.models import Notification, NotificationType
from apps.tenants.models import Location, Plan, Tenant

# Transactions
from apps.transactions.models import Transaction, TransactionType

# =============================================================================
# Authentic Ecuadorian / Latin American Name Pools
# =============================================================================
EC_FIRST_NAMES_M = [
    "Carlos",
    "Juan",
    "Sebastián",
    "Andrés",
    "Diego",
    "Mateo",
    "Santiago",
    "Ricardo",
    "Fernando",
    "Alejandro",
    "Daniel",
    "Gabriel",
    "Luis",
    "Roberto",
    "Eduardo",
    "Francisco",
    "Emilio",
    "Pablo",
    "Nicolás",
    "Martín",
    "Cristian",
    "Xavier",
    "Leonardo",
    "Javier",
    "Jorge",
    "Patricio",
    "Mauricio",
    "Esteban",
    "Héctor",
    "Iván",
    "Óscar",
    "Marco",
    "Adrián",
    "Camilo",
    "Tomás",
    "Simón",
    "Samuel",
    "Josué",
]
EC_FIRST_NAMES_F = [
    "María",
    "Ana",
    "Valentina",
    "Camila",
    "Sofía",
    "Isabella",
    "Paula",
    "Daniela",
    "Gabriela",
    "Andrea",
    "Fernanda",
    "Carolina",
    "Lucía",
    "Lorena",
    "Patricia",
    "Verónica",
    "Cristina",
    "Diana",
    "Alejandra",
    "Natalia",
    "Paola",
    "Estefanía",
    "Catalina",
    "Juliana",
    "Valeria",
    "Mariana",
    "Monserrat",
    "Rocío",
    "Karina",
    "Soledad",
    "Elena",
    "Micaela",
    "Renata",
    "Ximena",
    "Tatiana",
    "Priscila",
    "Jessica",
]
EC_LASTNAMES = [
    "García",
    "Rodríguez",
    "Martínez",
    "López",
    "González",
    "Hernández",
    "Pérez",
    "Sánchez",
    "Ramírez",
    "Torres",
    "Flores",
    "Rivera",
    "Gómez",
    "Díaz",
    "Morales",
    "Reyes",
    "Cruz",
    "Ortega",
    "Castillo",
    "Jiménez",
    "Vargas",
    "Romero",
    "Herrera",
    "Medina",
    "Aguilar",
    "Vega",
    "Castro",
    "Ramos",
    "Zambrano",
    "Cevallos",
    "Pacheco",
    "Espinoza",
    "Salazar",
    "Mendoza",
    "Guerrero",
    "Paredes",
    "Cárdenas",
    "Suárez",
    "Chávez",
    "Delgado",
    "Andrade",
    "Vinueza",
    "Jaramillo",
    "Villacís",
    "Benalcázar",
    "Proaño",
    "Córdova",
    "Intriago",
]

EC_CITIES = [
    "Quito",
    "Guayaquil",
    "Cuenca",
    "Ambato",
    "Manta",
    "Riobamba",
    "Loja",
    "Ibarra",
]

# Phone prefixes for Ecuador
EC_PHONE_PREFIXES = ["+59398", "+59399", "+59396", "+59397"]


class Command(BaseCommand):
    help = "Seeds the entire Loyallia database with massive synthetic DEMO data using authentic Ecuadorian context."

    def add_arguments(self, parser):
        parser.add_argument(
            "--wipe",
            action="store_true",
            help="Wipe the database before seeding (Destructive!)",
        )

    def handle(self, *args, **options):
        if options["wipe"]:
            self.stdout.write(self.style.WARNING("Wiping existing synthetic data..."))
            with transaction.atomic():
                DailyAnalytics.objects.all().delete()
                CustomerAnalytics.objects.all().delete()
                ProgramAnalytics.objects.all().delete()
                Automation.objects.all().delete()
                Notification.objects.all().delete()
                Transaction.objects.all().delete()
                CustomerPass.objects.all().delete()
                Customer.objects.all().delete()
                Card.objects.all().delete()
                Invoice.objects.all().delete()
                PaymentMethod.objects.all().delete()
                Subscription.objects.all().delete()
                Location.objects.all().delete()
                User.objects.all().delete()
                Tenant.objects.all().delete()
            self.stdout.write(self.style.SUCCESS("Database wiped."))

        self.stdout.write("Starting massive data seed process (Ecuador context)...")

        with transaction.atomic():
            self._seed_data()

        self.stdout.write(self.style.SUCCESS("Successfully seeded massive test data!"))
        self.stdout.write("Test Credentials (Password is 123456):")
        self.stdout.write("  SuperAdmin: admin@loyallia.com")
        self.stdout.write("  Owner: carlos@cafeelritmo.ec")

    def _seed_data(self):
        now = timezone.now()

        # =====================================================================
        # 1. Tenant — Café El Ritmo (Quito, Ecuador)
        # =====================================================================
        tenant, _ = Tenant.objects.get_or_create(
            slug="cafe-el-ritmo",
            defaults={
                "name": "Café El Ritmo",
                "plan": Plan.FULL,
                "is_active": True,
                "country": "EC",
                "phone": "+593998765432",
                "address": "Av. República del Salvador N34-127 y Suiza, Quito",
                "primary_color": "#8B4513",
                "secondary_color": "#D2691E",
            },
        )

        # =====================================================================
        # 2. SuperAdmin
        # =====================================================================
        admin, _ = User.objects.get_or_create(
            email="admin@loyallia.com",
            defaults={
                "first_name": "Sistema",
                "last_name": "Admin",
                "role": UserRole.SUPER_ADMIN,
                "tenant": tenant,
                "is_active": True,
            },
        )
        if not admin.tenant:
            admin.tenant = tenant
        admin.set_password("123456")
        admin.save()

        # =====================================================================
        # 3. Staff Users (Ecuadorian names)
        # =====================================================================
        users_data = [
            ("carlos@cafeelritmo.ec", "Carlos", "Andrade Pacheco", UserRole.OWNER),
            (
                "gabriela@cafeelritmo.ec",
                "Gabriela",
                "Cevallos Torres",
                UserRole.MANAGER,
            ),
            ("sebastian@cafeelritmo.ec", "Sebastián", "Zambrano Reyes", UserRole.STAFF),
        ]
        for email, first, last, role in users_data:
            u, _ = User.objects.get_or_create(
                email=email,
                defaults={
                    "first_name": first,
                    "last_name": last,
                    "role": role,
                    "tenant": tenant,
                    "is_active": True,
                },
            )
            if not u.tenant:
                u.tenant = tenant
            u.set_password("123456")
            u.save()

        # =====================================================================
        # 4. Locations (Real Quito landmarks)
        # =====================================================================
        locations = []
        locations_data = [
            (
                "Café El Ritmo — La Pradera",
                "Quito",
                "Av. República del Salvador N34-127",
                True,
            ),
            (
                "Sucursal Cumbayá",
                "Cumbayá",
                "Centro Comercial Paseo San Francisco, Local 24",
                False,
            ),
            (
                "Sucursal CCI",
                "Quito",
                "Centro Comercial Iñaquito, Piso 2, Local 213",
                False,
            ),
            (
                "Sucursal Mall del Sol",
                "Guayaquil",
                "Mall del Sol, Planta Baja, Local B-12",
                False,
            ),
        ]
        for name, city, addr, is_primary in locations_data:
            loc, _ = Location.objects.get_or_create(
                tenant=tenant,
                name=name,
                defaults={"city": city, "address": addr, "is_primary": is_primary},
            )
            locations.append(loc)

        # =====================================================================
        # 5. Billing — Active FULL subscription
        # =====================================================================
        sub, _ = Subscription.objects.get_or_create(
            tenant=tenant,
            defaults={
                "plan": "full",
                "billing_cycle": "monthly",
                "status": SubscriptionStatus.ACTIVE,
            },
        )

        # =====================================================================
        # 6. Loyalty Programs (4 real-world programs)
        # =====================================================================
        c_stamp, _ = Card.objects.get_or_create(
            tenant=tenant,
            name="Café Frecuente ☕",
            defaults={
                "card_type": CardType.STAMP,
                "description": "Compra 6 cafés y el 7mo es GRATIS. Válido en todas las sucursales.",
                "background_color": "#8B4513",
                "text_color": "#FFFFFF",
                "metadata": {
                    "total_stamps": 6,
                    "stamps_to_reward": 1,
                    "reward_description": "Café de especialidad gratis",
                },
                "is_active": True,
            },
        )
        c_points, _ = Card.objects.get_or_create(
            tenant=tenant,
            name="Puntos Ritmo 🎯",
            defaults={
                "card_type": CardType.CASHBACK,
                "description": "Acumula el 10% de cada compra como crédito. Canjeable en cualquier producto.",
                "background_color": "#1A1A2E",
                "text_color": "#FFFFFF",
                "metadata": {
                    "cashback_percentage": 10.0,
                    "points_conversion_rate": 1.0,
                    "credit_expiry_days": 365,
                },
                "is_active": True,
            },
        )
        c_vip, _ = Card.objects.get_or_create(
            tenant=tenant,
            name="Club VIP El Ritmo 👑",
            defaults={
                "card_type": CardType.VIP_MEMBERSHIP,
                "description": "Membresía exclusiva con 15% de descuento permanente, prioridad y eventos VIP.",
                "background_color": "#2D1B69",
                "text_color": "#FFD700",
                "metadata": {
                    "membership_name": "Club VIP El Ritmo",
                    "monthly_fee": 9.99,
                    "annual_fee": 99.99,
                    "validity_period": "monthly",
                    "discount_percentage": 15,
                    "trial_days": 30,
                    "perks": [
                        "Descuento 15%",
                        "Prioridad en fila",
                        "Eventos exclusivos",
                    ],
                },
                "is_active": True,
            },
        )
        c_referral, _ = Card.objects.get_or_create(
            tenant=tenant,
            name="Refiere y Gana 🤝",
            defaults={
                "card_type": CardType.REFERRAL_PASS,
                "description": "Invita a un amigo y ambos reciben $3 de crédito.",
                "background_color": "#0F766E",
                "text_color": "#FFFFFF",
                "metadata": {
                    "referrer_reward": 3.00,
                    "referee_reward": 3.00,
                    "max_referrals_per_customer": 10,
                },
                "is_active": True,
            },
        )

        # =====================================================================
        # 7. Mass Customers — 200 with authentic Ecuadorian names
        # =====================================================================
        self.stdout.write("  -> Generando 200+ clientes ecuatorianos...")
        customers = []
        all_first_names = EC_FIRST_NAMES_M + EC_FIRST_NAMES_F
        used_emails = set()

        for i in range(1, 201):
            first = random.choice(all_first_names)
            last1 = random.choice(EC_LASTNAMES)
            last2 = random.choice(EC_LASTNAMES)
            full_last = f"{last1} {last2}" if random.random() > 0.3 else last1
            email_base = f"{first.lower().replace('á','a').replace('é','e').replace('í','i').replace('ó','o').replace('ú','u').replace('ñ','n')}.{last1.lower().replace('á','a').replace('é','e').replace('í','i').replace('ó','o').replace('ú','u').replace('ñ','n')}"
            email = f"{email_base}{i}@gmail.com"
            if email in used_emails:
                email = f"{email_base}{i}{random.randint(10,99)}@gmail.com"
            used_emails.add(email)

            phone_prefix = random.choice(EC_PHONE_PREFIXES)
            phone = f"{phone_prefix}{random.randint(1000000, 9999999)}"

            created_days_ago = random.randint(1, 90)
            c_date = now - timedelta(days=created_days_ago)

            c = Customer.objects.create(
                tenant=tenant,
                email=email,
                first_name=first,
                last_name=full_last,
                phone=phone,
                date_of_birth=(
                    now - timedelta(days=365 * random.randint(18, 55))
                ).date(),
            )
            Customer.objects.filter(id=c.id).update(created_at=c_date)
            customers.append(c)

            # Enroll in stamp program (everyone)
            CustomerPass.objects.create(
                customer=c,
                card=c_stamp,
                pass_data={"stamp_count": random.randint(0, 5)},
                enrolled_at=c_date,
            )
            # 60% also enroll in cashback
            if random.random() > 0.4:
                CustomerPass.objects.create(
                    customer=c,
                    card=c_points,
                    pass_data={"cashback_balance": str(Decimal(random.randint(2, 45)))},
                    enrolled_at=c_date + timedelta(days=random.randint(0, 5)),
                )
            # 20% VIP
            if random.random() > 0.8:
                CustomerPass.objects.create(
                    customer=c,
                    card=c_vip,
                    pass_data={"membership_tier": "gold", "discount_active": True},
                    enrolled_at=c_date + timedelta(days=random.randint(1, 10)),
                )
            # 15% referral
            if random.random() > 0.85:
                CustomerPass.objects.create(
                    customer=c,
                    card=c_referral,
                    pass_data={
                        "referral_code": f"REF-{first[:3].upper()}{random.randint(100,999)}",
                        "referrals_made": random.randint(0, 5),
                    },
                    enrolled_at=c_date + timedelta(days=random.randint(0, 7)),
                )

        # =====================================================================
        # 8. Mass Transactions — 2000+
        # =====================================================================
        self.stdout.write("  -> Generando 2000+ transacciones...")
        cashier = User.objects.get(email="sebastian@cafeelritmo.ec")
        passes = list(CustomerPass.objects.all())

        transactions_to_create = []
        for _ in range(2000):
            days_ago = int(random.expovariate(0.03))  # More recent = more frequent
            days_ago = min(days_ago, 90)
            t_date = now - timedelta(days=days_ago)
            t_pass = random.choice(passes)
            if t_date < t_pass.enrolled_at:
                t_date = t_pass.enrolled_at + timedelta(days=1)

            amount = Decimal(str(round(random.uniform(3.50, 28.00), 2)))
            t_type = random.choices(
                [
                    TransactionType.STAMP_EARNED,
                    TransactionType.CASHBACK_EARNED,
                    TransactionType.STAMP_REDEEMED,
                    TransactionType.CASHBACK_REDEEMED,
                ],
                weights=[45, 30, 15, 10],
                k=1,
            )[0]

            transactions_to_create.append(
                Transaction(
                    tenant=tenant,
                    customer_pass=t_pass,
                    location=random.choice(locations),
                    staff=cashier,
                    transaction_type=t_type,
                    amount=amount,
                    quantity=1,
                )
            )

        Transaction.objects.bulk_create(transactions_to_create)

        # Distribute dates
        all_tx = list(Transaction.objects.all())
        for tx in all_tx:
            random_date = now - timedelta(days=int(random.expovariate(0.03)))
            if random_date < now - timedelta(days=90):
                random_date = now - timedelta(days=random.randint(0, 90))
            Transaction.objects.filter(id=tx.id).update(created_at=random_date)

        # =====================================================================
        # 9. Rolling DailyAnalytics (90 days)
        # =====================================================================
        self.stdout.write("  -> Hidratando analítica de series de tiempo (90 días)...")
        for day_offset in range(90, -1, -1):
            target_date = (now - timedelta(days=day_offset)).date()
            daily_tx = Transaction.objects.filter(
                tenant=tenant, created_at__date=target_date
            )

            tx_count = daily_tx.count()
            daily_rev = daily_tx.aggregate(Sum("amount"))["amount__sum"] or Decimal(
                "0.00"
            )
            new_customers = Customer.objects.filter(
                tenant=tenant, created_at__date=target_date
            ).count()
            new_enrollments = CustomerPass.objects.filter(
                card__tenant=tenant, enrolled_at__date=target_date
            ).count()
            rewards_issued = daily_tx.filter(
                transaction_type__in=[
                    TransactionType.STAMP_EARNED,
                    TransactionType.CASHBACK_EARNED,
                ]
            ).count()
            rewards_redeemed = daily_tx.filter(
                transaction_type__in=[
                    TransactionType.STAMP_REDEEMED,
                    TransactionType.CASHBACK_REDEEMED,
                ]
            ).count()

            DailyAnalytics.objects.update_or_create(
                tenant=tenant,
                analytics_date=target_date,
                defaults={
                    "new_customers": new_customers,
                    "new_enrollments": new_enrollments,
                    "transactions": tx_count,
                    "daily_revenue": daily_rev,
                    "rewards_issued": rewards_issued,
                    "rewards_redeemed": rewards_redeemed,
                },
            )

        # =====================================================================
        # 10. Customer & Program Analytics Segments
        # =====================================================================
        self.stdout.write("  -> Calculando segmentación de clientes...")
        for c in Customer.objects.filter(tenant=tenant):
            analytics, _ = CustomerAnalytics.objects.get_or_create(
                customer=c, tenant=tenant
            )
            analytics.update_metrics()

        for p in Card.objects.filter(tenant=tenant):
            analytics, _ = ProgramAnalytics.objects.get_or_create(card=p, tenant=tenant)
            analytics.update_metrics()

        # =====================================================================
        # 11. Automation Rules
        # =====================================================================
        self.stdout.write("  -> Creando reglas de automatización...")
        automations_data = [
            (
                "Bienvenida automática",
                "Envía un mensaje de bienvenida 15 minutos después de registrarse",
                "customer_enrolled",
                "send_notification",
                200,
            ),
            (
                "Alerta de recompensa",
                "Notifica al cliente cuando acumula 100 puntos de cashback",
                "reward_earned",
                "send_notification",
                134,
            ),
            (
                "Recuperación de clientes inactivos",
                "Envía cupón especial después de 30 días sin visita",
                "days_inactive",
                "send_notification",
                67,
            ),
            (
                "Felicitación de cumpleaños",
                "Envía un café gratis en el cumpleaños del cliente",
                "birthday",
                "send_notification",
                42,
            ),
        ]
        for name, desc, trigger, action, execs in automations_data:
            Automation.objects.create(
                tenant=tenant,
                name=name,
                description=desc,
                trigger=trigger,
                action=action,
                is_active=True,
                total_executions=execs,
            )

        # =====================================================================
        # 12. Campaign Notifications (simulated via Marketing notifications)
        # =====================================================================
        self.stdout.write("  -> Creando campañas de notificación push...")
        campaign_customers = list(Customer.objects.filter(tenant=tenant)[:60])

        campaigns = [
            {
                "title": "🎯 ¡Doble de puntos este fin de semana!",
                "message": "Visítanos en Café El Ritmo este sábado y domingo. Todas tus compras suman el doble de puntos Ritmo.",
                "days_ago": 3,
                "recipients": campaign_customers,
            },
            {
                "title": "☕ Tu café gratis te espera",
                "message": "Vimos que no has venido en 15 días, ¡te extrañamos! Pasa por cualquier sucursal y disfruta un latte de cortesía.",
                "days_ago": 1,
                "recipients": campaign_customers[:20],
            },
            {
                "title": "🎉 Aniversario Café El Ritmo — 3 Años",
                "message": "¡Estamos de aniversario! Del 1 al 7 de abril, todas las bebidas de especialidad al 2x1. Celebra con nosotros.",
                "days_ago": 5,
                "recipients": campaign_customers[:50],
            },
            {
                "title": "👑 Nuevo: Club VIP El Ritmo",
                "message": "Únete a nuestro club VIP y obtén 15% de descuento permanente, acceso a eventos exclusivos y prioridad en fila.",
                "days_ago": 10,
                "recipients": campaign_customers[:40],
            },
            {
                "title": "🤝 Refiere un amigo y gana $3",
                "message": "Invita a un amigo a Café El Ritmo. Cuando se registre, ambos reciben $3 de crédito para su próxima compra.",
                "days_ago": 7,
                "recipients": campaign_customers[:30],
            },
        ]

        total_notifs = 0
        for campaign in campaigns:
            notifs = []
            for c in campaign["recipients"]:
                notifs.append(
                    Notification(
                        tenant=tenant,
                        customer=c,
                        title=campaign["title"],
                        message=campaign["message"],
                        notification_type=NotificationType.MARKETING,
                        is_sent=True,
                        is_read=random.random() > 0.5,
                        is_clicked=random.random() > 0.7,
                    )
                )
            Notification.objects.bulk_create(notifs)
            Notification.objects.filter(title=campaign["title"]).update(
                created_at=now - timedelta(days=campaign["days_ago"])
            )
            total_notifs += len(notifs)

        self.stdout.write(
            self.style.SUCCESS(
                f"  -> Creadas {total_notifs} notificaciones en {len(campaigns)} campañas"
            )
        )
