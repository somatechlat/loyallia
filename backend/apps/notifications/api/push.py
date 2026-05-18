"""Push notification device management endpoints."""

from django.shortcuts import get_object_or_404

from apps.notifications.models import PushDevice
from common.permissions import jwt_auth

from .base import PushDeviceSchema, _get_customer_or_403, router


@router.post(
    "/devices/register/",
    auth=jwt_auth,
    summary="Register device for push notifications",
)
def register_device(request, data: PushDeviceSchema):
    """Register a device for push notifications."""
    customer = _get_customer_or_403(request)

 # Get or create device
    device, created = PushDevice.objects.update_or_create(
        customer=customer,
        device_token=data.device_token,
        defaults={
            "device_type": data.device_type,
            "device_model": data.device_model,
            "fcm_token": data.fcm_token,
            "apns_token": data.apns_token,
            "is_active": True,
        },
    )

    return {
        "success": True,
        "message": "Device registered successfully",
        "device_id": str(device.id),
    }


@router.delete("/devices/{device_id}/", auth=jwt_auth, summary="Unregister device")
def unregister_device(request, device_id: str):
    """Unregister a device from push notifications.
    LYL-H-API-012: Device queries are tenant-scoped via customer relationship.
    """
    customer = _get_customer_or_403(request)
 # LYL-H-API-012: Scope device query to customer's devices (tenant isolation)
    device = get_object_or_404(PushDevice, id=device_id, customer=customer)

    device.is_active = False
    device.save()

    return {"success": True, "message": "Device unregistered"}


@router.get("/devices/", auth=jwt_auth, summary="List registered devices")
def list_devices(request):
    """List all registered devices for current user."""
    customer = _get_customer_or_403(request)

    devices = PushDevice.objects.filter(customer=customer, is_active=True)

    return [
        {
            "id": str(device.id),
            "device_type": device.device_type,
            "device_model": device.device_model,
            "registered_at": device.registered_at.isoformat(),
            "last_used": device.last_used.isoformat() if device.last_used else None,
        }
        for device in devices
    ]
