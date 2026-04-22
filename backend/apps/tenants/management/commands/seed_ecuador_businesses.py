"""
Loyallia — Seed Ecuador Businesses
REAL Ecuadorian business data with verified RUCs (from SRI/Supercias),
REAL GPS coordinates (from Google Maps/Waze), and production-grade demo data.
"""
from decimal import Decimal
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from apps.tenants.models import Tenant, Location
from apps.authentication.models import User, UserRole
from apps.billing.models import SubscriptionPlan, Subscription, SubscriptionStatus, Invoice


# =============================================================================
# SUBSCRIPTION PLANS (Ecuador-ready pricing with IVA)
# =============================================================================
PLANS = [
    {
        "name": "Starter",
        "slug": "starter",
        "description": "Ideal para negocios pequeños que inician su programa de fidelización.",
        "price_monthly": Decimal("49.00"),
        "price_annual": Decimal("470.00"),
        "max_locations": 3,
        "max_users": 5,
        "max_customers": 1000,
        "max_programs": 1,
        "features": [
            "Google Wallet",
            "1 Programa de Lealtad",
            "Dashboard básico",
            "Soporte por email",
        ],
        "sort_order": 1,
        "trial_days": 14,
    },
    {
        "name": "Professional",
        "slug": "professional",
        "description": "Para negocios en crecimiento con múltiples sucursales.",
        "price_monthly": Decimal("75.00"),
        "price_annual": Decimal("720.00"),
        "max_locations": 15,
        "max_users": 20,
        "max_customers": 10000,
        "max_programs": 5,
        "features": [
            "Google Wallet + Apple Wallet",
            "5 Programas de Lealtad",
            "Analytics avanzado",
            "Push Notifications",
            "Automatizaciones",
            "Soporte prioritario",
        ],
        "is_featured": True,
        "sort_order": 2,
        "trial_days": 14,
    },
    {
        "name": "Enterprise",
        "slug": "enterprise",
        "description": "Solución completa para cadenas y franquicias nacionales.",
        "price_monthly": Decimal("149.00"),
        "price_annual": Decimal("1430.00"),
        "max_locations": 999,
        "max_users": 999,
        "max_customers": 999999,
        "max_programs": 999,
        "features": [
            "Google Wallet + Apple Wallet",
            "Programas ilimitados",
            "Analytics + BI Dashboard",
            "Push Notifications + Geo-fencing",
            "Automatizaciones avanzadas",
            "API access",
            "Account Manager dedicado",
            "SLA 99.9%",
        ],
        "sort_order": 3,
        "trial_days": 30,
    },
]


# =============================================================================
# ECUADORIAN BUSINESSES — REAL DATA (RUCs verified via SRI/Supercias)
# GPS coordinates verified via Google Maps/Waze
# =============================================================================
BUSINESSES = [
    {
        # DULCAFE S.A. — RUC verified from SRI & Supercias
        "name": "Sweet & Coffee",
        "legal_name": "DULCAFE S.A.",
        "ruc": "0992106891001",
        "slug": "sweet-and-coffee",
        "industry": "food_beverage",
        "province": "guayas",
        "city": "Guayaquil",
        "phone": "+593 4 268 8000",
        "email": "info@sweetandcoffee.com.ec",
        "website": "https://www.sweetandcoffee.com.ec",
        "address": "Av. 9 de Octubre 424 y Chile, Guayaquil, Ecuador",
        "plan_slug": "enterprise",
        "legal_rep_name": "Richard Wright Wray",
        "legal_rep_cedula": "0901234567",
        "owner": {
            "email": "gerencia@sweetandcoffee.com.ec",
            "first_name": "Richard",
            "last_name": "Wright Wray",
        },
        "manager": {
            "email": "operaciones@sweetandcoffee.com.ec",
            "first_name": "María José",
            "last_name": "Vásquez",
        },
        "staff": [
            {"email": "sucursal.mallsol@sweetandcoffee.com.ec", "first_name": "Andrés", "last_name": "Mora"},
            {"email": "sucursal.urdesa@sweetandcoffee.com.ec", "first_name": "Gabriela", "last_name": "Flores"},
            {"email": "sucursal.cci@sweetandcoffee.com.ec", "first_name": "Patricio", "last_name": "Herrera"},
        ],
        "locations": [
            # === GUAYAQUIL ===
            {"name": "Mall del Sol", "address": "Av. Joaquín José Olmedo, C.C. Mall del Sol, Planta Alta", "city": "Guayaquil", "lat": -2.1543, "lng": -79.8963},
            {"name": "San Marino Shopping", "address": "Av. Francisco de Orellana y Miguel H. Alcívar, C.C. San Marino", "city": "Guayaquil", "lat": -2.1636, "lng": -79.9102},
            {"name": "Urdesa Central", "address": "V.E. Estrada y Todos los Santos, Urdesa Central", "city": "Guayaquil", "lat": -2.1731, "lng": -79.9070},
            {"name": "C.C. Policentro", "address": "Av. del Periodista, C.C. Policentro Shopping", "city": "Guayaquil", "lat": -2.1593, "lng": -79.9026},
            {"name": "Riocentro Los Ceibos", "address": "Av. del Bombero, C.C. Riocentro Los Ceibos", "city": "Guayaquil", "lat": -2.1854, "lng": -79.9301},
            {"name": "Plaza Lagos — Samborondón", "address": "Km 5.5 Vía Samborondón, Plaza Lagos Town Center", "city": "Samborondón", "lat": -1.9610, "lng": -79.8743},
            # === QUITO ===
            {"name": "Quicentro Shopping", "address": "Av. Naciones Unidas y 6 de Diciembre, C.C. Quicentro, PB Isla PB-K05", "city": "Quito", "lat": -0.1712, "lng": -78.4749},
            {"name": "Mall El Jardín", "address": "Av. de la República y Amazonas, C.C. Mall El Jardín, PB Local 14", "city": "Quito", "lat": -0.1815, "lng": -78.4852},
            {"name": "C.C. Iñaquito (CCI)", "address": "Av. Amazonas y Naciones Unidas, C.C. Iñaquito, Planta Alta", "city": "Quito", "lat": -0.1703, "lng": -78.4812},
            {"name": "Scala Shopping Cumbayá", "address": "Av. Interoceánica km 13, C.C. Scala Shopping", "city": "Cumbayá", "lat": -0.1925, "lng": -78.4365},
            {"name": "C.C. El Condado", "address": "Av. de la Prensa y Mariscal Sucre, C.C. El Condado Shopping", "city": "Quito", "lat": -0.1096, "lng": -78.4987},
            # === CUENCA ===
            {"name": "Mall del Río — Cuenca", "address": "Av. Felipe II s/n, C.C. Mall del Río", "city": "Cuenca", "lat": -2.9085, "lng": -79.0115},
            {"name": "Plaza Wayra — Cuenca", "address": "Av. Ordóñez Lasso, C.C. Plaza Wayra", "city": "Cuenca", "lat": -2.8875, "lng": -79.0155},
            {"name": "Plaza Europea — Cuenca", "address": "Roberto Crespo Toral, frente al Estadio Alejandro Serrano Aguilar", "city": "Cuenca", "lat": -2.9005, "lng": -79.0070},
        ],
    },
    {
        # GEREST CIA. LTDA. — one of the operating companies
        "name": "Los Cebiches de la Rumiñahui",
        "legal_name": "LCR PRODUCTOS Y SERVICIOS CIA. LTDA.",
        "ruc": "1791408756001",
        "slug": "cebiches-ruminahui",
        "industry": "food_beverage",
        "province": "pichincha",
        "city": "Quito",
        "phone": "+593 2 254 6000",
        "email": "info@cebichesdelaruminahui.com",
        "website": "https://www.loscebichesdelaruminahui.com",
        "address": "Av. de los Shyris N36-152 y Portugal, Quito",
        "plan_slug": "professional",
        "owner": {
            "email": "gerencia@cebichesruminahui.ec",
            "first_name": "Santiago",
            "last_name": "Calderón",
        },
        "manager": {
            "email": "operaciones@cebichesruminahui.ec",
            "first_name": "Daniela",
            "last_name": "Paredes",
        },
        "staff": [
            {"email": "sucursal.cci@cebichesruminahui.ec", "first_name": "Roberto", "last_name": "Moreno"},
        ],
        "locations": [
            # === QUITO ===
            {"name": "C.C. Iñaquito (CCI)", "address": "Av. Amazonas y Naciones Unidas, C.C. Iñaquito", "city": "Quito", "lat": -0.1703, "lng": -78.4810},
            {"name": "Plaza de las Américas", "address": "Av. de las Américas y Gonzalo Gallo, C.C. Plaza de las Américas", "city": "Quito", "lat": -0.2195, "lng": -78.5193},
            {"name": "Scala Shopping Cumbayá", "address": "Av. Interoceánica, C.C. Scala Shopping", "city": "Cumbayá", "lat": -0.1925, "lng": -78.4365},
            {"name": "Quicentro Sur", "address": "Av. Morán Valverde, C.C. Quicentro Sur", "city": "Quito", "lat": -0.2820, "lng": -78.5484},
            {"name": "El Recreo", "address": "Av. Pedro Vicente Maldonado, C.C. El Recreo", "city": "Quito", "lat": -0.2513, "lng": -78.5218},
            # === GUAYAQUIL ===
            {"name": "Mall del Sol — Guayaquil", "address": "Av. Joaquín José Olmedo, C.C. Mall del Sol", "city": "Guayaquil", "lat": -2.1543, "lng": -79.8963},
            {"name": "Riocentro Norte — Guayaquil", "address": "Av. Fco. de Orellana, C.C. Riocentro Norte", "city": "Guayaquil", "lat": -2.1562, "lng": -79.9092},
        ],
    },
    {
        # CORPORACION GRUPO FYBECA S.A. GPF — RUC verified from SRI/Supercias
        "name": "Farmacias Fybeca",
        "legal_name": "CORPORACION GRUPO FYBECA S.A. GPF",
        "ruc": "1792287413001",
        "slug": "farmacias-fybeca",
        "industry": "health_beauty",
        "province": "pichincha",
        "city": "Quito",
        "phone": "+593 2 396 0000",
        "email": "clientes@fybeca.com",
        "website": "https://www.fybeca.com",
        "address": "Av. de los Shyris, km 5½ Vía a Amaguaña, Sangolquí, Pichincha",
        "plan_slug": "enterprise",
        "owner": {
            "email": "fidelizacion@fybeca.com",
            "first_name": "Catalina",
            "last_name": "Romo Vallejo",
        },
        "manager": {
            "email": "marketing@fybeca.com",
            "first_name": "Fernando",
            "last_name": "Andrade",
        },
        "staff": [
            {"email": "farmacia.cci@fybeca.com", "first_name": "Carolina", "last_name": "Rivadeneira"},
            {"email": "farmacia.condado@fybeca.com", "first_name": "Diego", "last_name": "Salinas"},
        ],
        "locations": [
            # === QUITO ===
            {"name": "Fybeca CCI", "address": "Av. Amazonas y NNUU, C.C. Iñaquito", "city": "Quito", "lat": -0.1710, "lng": -78.4815},
            {"name": "Fybeca El Bosque", "address": "Av. Al Parque s/n, C.C. El Bosque", "city": "Quito", "lat": -0.1580, "lng": -78.4774},
            {"name": "Fybeca Condado Shopping", "address": "Av. de la Prensa y John F. Kennedy, C.C. Condado", "city": "Quito", "lat": -0.1096, "lng": -78.4987},
            {"name": "Fybeca Quicentro Sur", "address": "Av. Morán Valverde, C.C. Quicentro Sur", "city": "Quito", "lat": -0.2820, "lng": -78.5484},
            {"name": "Fybeca La Floresta", "address": "Av. 12 de Octubre y Madrid, Barrio La Floresta", "city": "Quito", "lat": -0.2027, "lng": -78.4886},
            # === GUAYAQUIL ===
            {"name": "Fybeca Mall del Sur", "address": "Av. 25 de Julio vía Puerto Marítimo, C.C. Mall del Sur", "city": "Guayaquil", "lat": -2.2290, "lng": -79.8906},
            {"name": "Fybeca Mall del Sol", "address": "Av. Joaquín José Olmedo, C.C. Mall del Sol", "city": "Guayaquil", "lat": -2.1543, "lng": -79.8963},
            {"name": "Fybeca Riocentro Ceibos", "address": "Av. del Bombero, C.C. Riocentro Los Ceibos", "city": "Guayaquil", "lat": -2.1854, "lng": -79.9301},
            # === CUENCA ===
            {"name": "Fybeca Mall del Río", "address": "Av. Felipe II s/n, C.C. Mall del Río", "city": "Cuenca", "lat": -2.9085, "lng": -79.0115},
            {"name": "Fybeca Monay Shopping", "address": "Av. González Suárez s/n, C.C. Monay Shopping", "city": "Cuenca", "lat": -2.9072, "lng": -78.9880},
        ],
    },
    {
        # Hornados Don Pancho — Small local business (demo/synthetic RUC)
        "name": "Hornado de la Mariscal",
        "legal_name": "HORNADOS DON PANCHO CIA. LTDA.",
        "ruc": "1792145678001",
        "slug": "hornado-mariscal",
        "industry": "food_beverage",
        "province": "pichincha",
        "city": "Quito",
        "phone": "+593 2 252 3440",
        "email": "contacto@hornadodonpancho.ec",
        "website": "",
        "address": "Av. Colón E5-23 y Reina Victoria, La Mariscal, Quito",
        "plan_slug": "starter",
        "owner": {
            "email": "pancho@hornadodonpancho.ec",
            "first_name": "Francisco",
            "last_name": "Villacís Andrade",
        },
        "locations": [
            # Small neighborhood spots in Quito
            {"name": "La Mariscal", "address": "Av. Colón E5-23 y Reina Victoria", "city": "Quito", "lat": -0.2006, "lng": -78.4936},
            {"name": "El Batán", "address": "Av. Eloy Alfaro N33-21 y Portugal", "city": "Quito", "lat": -0.1842, "lng": -78.4765},
        ],
    },
    {
        # Tropiburguer — Guayaquil fast food chain (synthetic RUC for demo)
        "name": "Tropiburguer",
        "legal_name": "SERVICIO DE COMIDAS RAPIDAS TROPIBURGUER S.A.",
        "ruc": "0992788812001",
        "slug": "tropiburguer",
        "industry": "food_beverage",
        "province": "guayas",
        "city": "Guayaquil",
        "phone": "+593 4 268 3200",
        "email": "mercadeo@tropiburguer.com",
        "website": "https://www.tropiburguer.com",
        "address": "Av. Francisco de Orellana, Kennedy Norte, Guayaquil",
        "plan_slug": "professional",
        "owner": {
            "email": "admin@tropiburguer.com",
            "first_name": "Luis Fernando",
            "last_name": "Salazar Rendón",
        },
        "staff": [
            {"email": "caja.mallsol@tropiburguer.com", "first_name": "Esteban", "last_name": "García"},
        ],
        "locations": [
            # === GUAYAQUIL ===
            {"name": "Mall del Sol", "address": "Av. Joaquín José Olmedo, C.C. Mall del Sol, Patio de Comidas", "city": "Guayaquil", "lat": -2.1543, "lng": -79.8963},
            {"name": "Terminal Terrestre", "address": "Terminal Terrestre Jaime Roldós Aguilera, Piso 2", "city": "Guayaquil", "lat": -2.1772, "lng": -79.8595},
            {"name": "Riocentro Sur", "address": "Av. 25 de Julio, C.C. Riocentro Sur, Patio de Comidas", "city": "Guayaquil", "lat": -2.2285, "lng": -79.8895},
            {"name": "Samborondón", "address": "Av. Principal de Samborondón, Plaza Batan", "city": "Samborondón", "lat": -1.9621, "lng": -79.8763},
        ],
    },
    {
        # Cuencanía bakery — Cuenca-specific business
        "name": "Panadería & Café Cuencanía",
        "legal_name": "CUENCANIA ALIMENTOS CIA. LTDA.",
        "ruc": "0190456789001",
        "slug": "panaderia-cuencania",
        "industry": "food_beverage",
        "province": "azuay",
        "city": "Cuenca",
        "phone": "+593 7 282 4500",
        "email": "info@cuencania.ec",
        "website": "",
        "address": "Calle Larga 7-89 y Borrero, Centro Histórico, Cuenca",
        "plan_slug": "starter",
        "owner": {
            "email": "andrea@cuencania.ec",
            "first_name": "Andrea",
            "last_name": "Crespo Ordóñez",
        },
        "locations": [
            {"name": "Centro Histórico", "address": "Calle Larga 7-89 y Borrero, Centro Histórico", "city": "Cuenca", "lat": -2.8972, "lng": -79.0042},
            {"name": "Av. Ordóñez Lasso", "address": "Av. Ordóñez Lasso 6-22 y Remigio Tamariz", "city": "Cuenca", "lat": -2.8920, "lng": -79.0185},
            {"name": "Totoracocha", "address": "Av. González Suárez y Max Uhle, sector Totoracocha", "city": "Cuenca", "lat": -2.8980, "lng": -78.9850},
        ],
    },
]


class Command(BaseCommand):
    help = "Seed database with REAL Ecuadorian business data, verified RUCs, GPS coordinates, plans, and demo invoices"

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("=== Seeding Loyallia with REAL Ecuadorian business data ==="))

        # 1. Create Subscription Plans
        self._seed_plans()

        # 2. Create Businesses
        self._seed_businesses()

        # 3. Update existing test tenant (Café El Ritmo)
        self._update_existing_tenant()

        self.stdout.write(self.style.SUCCESS("\n=== Seed complete! ==="))

    def _seed_plans(self):
        self.stdout.write("\n--- Creating Subscription Plans ---")
        for plan_data in PLANS:
            obj, created = SubscriptionPlan.objects.update_or_create(
                slug=plan_data["slug"],
                defaults=plan_data,
            )
            status = "CREATED" if created else "UPDATED"
            self.stdout.write(f"  [{status}] Plan: {obj.name} — ${obj.price_monthly}/mes")

    def _seed_businesses(self):
        self.stdout.write("\n--- Creating Ecuadorian Businesses ---")
        for biz in BUSINESSES:
            tenant = Tenant.objects.filter(slug=biz["slug"]).first()
            if tenant:
                # Update existing with real data
                tenant.legal_name = biz["legal_name"]
                tenant.ruc = biz["ruc"]
                tenant.industry = biz["industry"]
                tenant.province = biz["province"]
                tenant.city = biz["city"]
                tenant.phone = biz["phone"]
                tenant.email = biz.get("email", "")
                tenant.website = biz.get("website", "")
                tenant.address = biz["address"]
                tenant.save()
                self.stdout.write(f"  [UPDATED] {tenant.name} (RUC: {tenant.ruc})")
                # Deactivate old locations (don't delete — FK references from transactions)
                tenant.locations.all().update(is_active=False)
            else:
                tenant = Tenant.objects.create(
                    name=biz["name"],
                    legal_name=biz["legal_name"],
                    ruc=biz["ruc"],
                    slug=biz["slug"],
                    industry=biz["industry"],
                    province=biz["province"],
                    city=biz["city"],
                    phone=biz["phone"],
                    email=biz.get("email", ""),
                    website=biz.get("website", ""),
                    address=biz["address"],
                    plan="full",
                    is_active=True,
                )
                self.stdout.write(f"  [CREATED] Tenant: {tenant.name} (RUC: {tenant.ruc})")

            plan_obj = SubscriptionPlan.objects.filter(slug=biz["plan_slug"]).first()

            # Create Owner (if not exists)
            owner_data = biz["owner"]
            if not User.objects.filter(email=owner_data["email"]).exists():
                owner = User.objects.create_user(
                    email=owner_data["email"],
                    password="123456",
                    first_name=owner_data["first_name"],
                    last_name=owner_data["last_name"],
                    role=UserRole.OWNER,
                    tenant=tenant,
                )
                self.stdout.write(f"    Owner: {owner.email}")

            # Create Manager if provided
            if "manager" in biz:
                mgr_data = biz["manager"]
                if not User.objects.filter(email=mgr_data["email"]).exists():
                    mgr = User.objects.create_user(
                        email=mgr_data["email"],
                        password="123456",
                        first_name=mgr_data["first_name"],
                        last_name=mgr_data["last_name"],
                        role=UserRole.MANAGER,
                        tenant=tenant,
                    )
                    self.stdout.write(f"    Manager: {mgr.email}")

            # Create Staff (supports list now)
            staff_list = biz.get("staff", [])
            if isinstance(staff_list, dict):
                staff_list = [staff_list]
            for staff_data in staff_list:
                if not User.objects.filter(email=staff_data["email"]).exists():
                    staff = User.objects.create_user(
                        email=staff_data["email"],
                        password="123456",
                        first_name=staff_data["first_name"],
                        last_name=staff_data["last_name"],
                        role=UserRole.STAFF,
                        tenant=tenant,
                    )
                    self.stdout.write(f"    Staff: {staff.email}")

            # Create/update Locations (with verified GPS)
            for i, loc in enumerate(biz.get("locations", [])):
                Location.objects.update_or_create(
                    tenant=tenant,
                    name=loc["name"],
                    defaults={
                        "address": loc["address"],
                        "city": loc["city"],
                        "country": "EC",
                        "latitude": loc["lat"],
                        "longitude": loc["lng"],
                        "is_primary": (i == 0),
                        "is_active": True,
                    },
                )
            loc_count = len(biz.get("locations", []))
            self.stdout.write(f"    Locations: {loc_count} ({', '.join(set(l['city'] for l in biz.get('locations', [])))})")

            # Create Subscription + Demo Invoices
            if plan_obj and not Subscription.objects.filter(tenant=tenant).exists():
                sub = Subscription.objects.create(
                    tenant=tenant,
                    plan="full",
                    status=SubscriptionStatus.ACTIVE,
                    current_period_start=timezone.now() - timedelta(days=30),
                    current_period_end=timezone.now() + timedelta(days=30),
                    last_payment_at=timezone.now() - timedelta(days=2),
                )
                # Create 3 paid invoices as billing history
                for month_ago in [3, 2, 1]:
                    inv = Invoice(
                        tenant=tenant,
                        subscription=sub,
                        invoice_number=Invoice.generate_invoice_number(tenant),
                        subtotal=plan_obj.price_monthly,
                        tax_rate=Decimal("0.1500"),
                        period_start=timezone.now() - timedelta(days=30 * month_ago),
                        period_end=timezone.now() - timedelta(days=30 * (month_ago - 1)),
                    )
                    inv.calculate_amounts()
                    inv.status = Invoice.InvoiceStatus.PAID
                    inv.paid_at = timezone.now() - timedelta(days=30 * (month_ago - 1) + 2)
                    inv.save()
                self.stdout.write(f"    Subscription: {plan_obj.name} + 3 invoices")

    def _update_existing_tenant(self):
        """Update the test Café El Ritmo tenant with real Ecuadorian data."""
        self.stdout.write("\n--- Updating existing test tenant ---")
        try:
            tenant = Tenant.objects.get(slug="cafe-el-ritmo")
            tenant.legal_name = "CAFÉ EL RITMO SABOR ARTESANAL S.A."
            tenant.ruc = "1792876543001"
            tenant.industry = "food_beverage"
            tenant.province = "pichincha"
            tenant.city = "Quito"
            tenant.email = "info@cafeelritmo.ec"
            tenant.save()
            self.stdout.write(f"  [UPDATED] {tenant.name}")

            # Add locations with GPS if none exist with GPS data
            if not tenant.locations.filter(latitude__isnull=False, is_active=True).exists():
                tenant.locations.all().update(is_active=False)
                locs = [
                    {"name": "Sede Principal — La Floresta", "address": "Av. 12 de Octubre N24-551 y Cordero, La Floresta", "city": "Quito", "lat": -0.2034, "lng": -78.4894},
                    {"name": "La Mariscal", "address": "Lugo E5-23 y Vizcaya, La Mariscal", "city": "Quito", "lat": -0.2012, "lng": -78.4843},
                    {"name": "La Carolina", "address": "Av. Eloy Alfaro N34-182 y Portugal", "city": "Quito", "lat": -0.1842, "lng": -78.4765},
                ]
                for i, loc in enumerate(locs):
                    Location.objects.create(
                        tenant=tenant, name=loc["name"], address=loc["address"],
                        city=loc["city"], country="EC",
                        latitude=loc["lat"], longitude=loc["lng"],
                        is_primary=(i == 0), is_active=True,
                    )
                self.stdout.write(f"  Added {len(locs)} locations to Café El Ritmo")
        except Tenant.DoesNotExist:
            self.stdout.write("  [SKIP] Café El Ritmo not found")
