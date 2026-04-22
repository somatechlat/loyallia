"""
Loyallia — Analytics Models
Track customer behavior, program performance, and business metrics.
"""
import uuid
from django.db import models
from django.db.models import Sum, Count, Avg
from apps.tenants.models import Tenant
from apps.cards.models import Card
from apps.customers.models import Customer, CustomerPass


class CustomerAnalytics(models.Model):
    """
    Aggregated analytics for a single customer.
    Updated daily or on significant events.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="customer_analytics",
        verbose_name="Negocio"
    )
    customer = models.OneToOneField(
        Customer,
        on_delete=models.CASCADE,
        related_name="analytics",
        verbose_name="Cliente"
    )
    
    # Engagement metrics
    total_passes = models.PositiveIntegerField(default=0, verbose_name="Total de pases")
    active_passes = models.PositiveIntegerField(default=0, verbose_name="Pases activos")
    total_visits = models.PositiveIntegerField(default=0, verbose_name="Total de visitas")
    
    # Financial metrics
    total_spent = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name="Total gastado"
    )
    average_transaction = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Transacción promedio"
    )
    
    # Reward metrics
    total_rewards_earned = models.PositiveIntegerField(default=0, verbose_name="Recompensas ganadas")
    total_rewards_redeemed = models.PositiveIntegerField(default=0, verbose_name="Recompensas canjeadas")
    
    # Engagement segment
    segment = models.CharField(
        max_length=20,
        choices=[
            ("high_value", "Alto valor"),
            ("regular", "Regular"),
            ("at_risk", "En riesgo"),
            ("new", "Nuevo"),
            ("inactive", "Inactivo")
        ],
        default="new",
        verbose_name="Segmento"
    )
    
    # Timestamps
    last_updated = models.DateTimeField(auto_now=True, verbose_name="Última actualización")
    
    class Meta:
        db_table = "loyallia_customer_analytics"
        verbose_name = "Análisis de cliente"
        verbose_name_plural = "Análisis de clientes"

    def __str__(self) -> str:
        return f"Analytics - {self.customer.full_name}"

    def update_metrics(self) -> None:
        """Recalculate analytics metrics from raw data."""
        from django.db.models import Q
        from django.utils import timezone
        from datetime import timedelta
        
        # Update pass counts
        self.total_passes = self.customer.passes.count()
        self.active_passes = self.customer.passes.filter(is_active=True).count()
        
        # Update visit and spending data
        self.total_visits = self.customer.total_visits
        self.total_spent = self.customer.total_spent
        
        # Calculate average transaction
        if self.total_visits > 0:
            self.average_transaction = self.total_spent / self.total_visits
        
        # Count rewards from transactions
        from apps.transactions.models import Transaction, TransactionType
        
        earned_types = [
            TransactionType.STAMP_EARNED,
            TransactionType.CASHBACK_EARNED,
            TransactionType.REFERRAL_REWARD
        ]
        redeemed_types = [
            TransactionType.STAMP_REDEEMED,
            TransactionType.CASHBACK_REDEEMED,
            TransactionType.COUPON_REDEEMED,
            TransactionType.GIFT_REDEEMED
        ]
        
        self.total_rewards_earned = Transaction.objects.filter(
            customer_pass__customer=self.customer,
            transaction_type__in=earned_types
        ).count()
        
        self.total_rewards_redeemed = Transaction.objects.filter(
            customer_pass__customer=self.customer,
            transaction_type__in=redeemed_types
        ).count()
        
        # Determine segment based on LTV and activity
        days_since_creation = (timezone.now() - self.customer.created_at).days
        
        if self.total_visits == 0:
            self.segment = "inactive"
        elif days_since_creation < 30:
            self.segment = "new"
        elif self.total_spent > 500:
            self.segment = "high_value"
        elif self.total_visits < 2 and days_since_creation > 60:
            self.segment = "at_risk"
        else:
            self.segment = "regular"
        
        self.save()


class ProgramAnalytics(models.Model):
    """
    Aggregated analytics for a single loyalty program.
    Updated daily with program performance data.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="program_analytics",
        verbose_name="Negocio"
    )
    card = models.OneToOneField(
        Card,
        on_delete=models.CASCADE,
        related_name="analytics",
        verbose_name="Programa"
    )
    
    # Enrollment metrics
    total_enrollments = models.PositiveIntegerField(default=0, verbose_name="Total de inscritos")
    active_members = models.PositiveIntegerField(default=0, verbose_name="Miembros activos")
    
    # Activity metrics
    total_transactions = models.PositiveIntegerField(default=0, verbose_name="Total de transacciones")
    total_revenue = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name="Ingresos totales"
    )
    average_order_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Valor promedio de pedido"
    )
    
    # Reward metrics
    total_rewards_issued = models.PositiveIntegerField(default=0, verbose_name="Recompensas emitidas")
    total_rewards_redeemed = models.PositiveIntegerField(default=0, verbose_name="Recompensas canjeadas")
    redemption_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        verbose_name="Tasa de canje %"
    )
    
    # Engagement metrics
    engagement_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        verbose_name="Tasa de participación %"
    )
    repeat_purchase_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        verbose_name="Tasa de recompra %"
    )
    
    # Timestamps
    last_updated = models.DateTimeField(auto_now=True, verbose_name="Última actualización")
    
    class Meta:
        db_table = "loyallia_program_analytics"
        verbose_name = "Análisis de programa"
        verbose_name_plural = "Análisis de programas"

    def __str__(self) -> str:
        return f"Analytics - {self.card.name}"

    def update_metrics(self) -> None:
        """Recalculate program analytics from raw data."""
        from apps.transactions.models import Transaction, TransactionType
        
        # Enrollment metrics
        self.total_enrollments = self.card.passes.count()
        self.active_members = self.card.passes.filter(is_active=True).count()
        
        # Transaction metrics
        transactions = Transaction.objects.filter(customer_pass__card=self.card)
        self.total_transactions = transactions.count()
        self.total_revenue = transactions.aggregate(Sum("amount"))["amount__sum"] or 0
        
        if self.total_transactions > 0:
            self.average_order_value = self.total_revenue / self.total_transactions
        
        # Reward metrics
        earned_types = [
            TransactionType.STAMP_EARNED,
            TransactionType.CASHBACK_EARNED,
            TransactionType.REFERRAL_REWARD
        ]
        redeemed_types = [
            TransactionType.STAMP_REDEEMED,
            TransactionType.CASHBACK_REDEEMED,
            TransactionType.COUPON_REDEEMED,
            TransactionType.GIFT_REDEEMED
        ]
        
        self.total_rewards_issued = transactions.filter(
            transaction_type__in=earned_types
        ).count()
        
        self.total_rewards_redeemed = transactions.filter(
            transaction_type__in=redeemed_types
        ).count()
        
        if self.total_rewards_issued > 0:
            self.redemption_rate = (self.total_rewards_redeemed / self.total_rewards_issued) * 100
        
        # Engagement metrics
        if self.total_enrollments > 0:
            self.engagement_rate = (self.active_members / self.total_enrollments) * 100
        
        # Repeat purchase rate (customers with 2+ transactions)
        repeat_customers = CustomerPass.objects.filter(
            card=self.card
        ).annotate(
            transaction_count=Count('transactions')
        ).filter(transaction_count__gte=2).count()
        
        if self.active_members > 0:
            self.repeat_purchase_rate = (repeat_customers / self.active_members) * 100
        
        self.save()


class DailyAnalytics(models.Model):
    """
    Daily snapshot of business metrics.
    Used for trend analysis and reporting.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="daily_analytics",
        verbose_name="Negocio"
    )
    
    # Date
    analytics_date = models.DateField(db_index=True, verbose_name="Fecha")
    
    # Daily metrics
    new_customers = models.PositiveIntegerField(default=0, verbose_name="Nuevos clientes")
    new_enrollments = models.PositiveIntegerField(default=0, verbose_name="Nuevas inscripciones")
    transactions = models.PositiveIntegerField(default=0, verbose_name="Transacciones")
    daily_revenue = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name="Ingresos diarios"
    )
    
    # Reward metrics
    rewards_issued = models.PositiveIntegerField(default=0, verbose_name="Recompensas emitidas")
    rewards_redeemed = models.PositiveIntegerField(default=0, verbose_name="Recompensas canjeadas")
    
    # Notifications
    notifications_sent = models.PositiveIntegerField(default=0, verbose_name="Notificaciones enviadas")
    
    class Meta:
        db_table = "loyallia_daily_analytics"
        verbose_name = "Análisis diario"
        verbose_name_plural = "Análisis diarios"
        ordering = ["-analytics_date"]
        unique_together = ["tenant", "analytics_date"]
        indexes = [
            models.Index(fields=["tenant", "-analytics_date"]),
        ]

    def __str__(self) -> str:
        return f"{self.tenant.name} - {self.analytics_date}"
