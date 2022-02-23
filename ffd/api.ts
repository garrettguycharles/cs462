import { api, endpoint, request, response, body } from "@airtasker/spot";

@api({
    name: "FastFlowerDelivery API",
    version: "0.0.0.1"
})
class Api {}

@endpoint({
    method: "POST",
    path: "/delivery",
    tags: [
        "delivery"
    ]
})
class CreateUser {
    @request
    request(@body body: CreateDeliveryRequest) {}

    @response({ status: 201 })
    response(@body body: CreateDeliveryResponse) {}
}

interface CreateDeliveryRequest {
    vendorId: string;
    pickUpAddress: string;
    pickUpTime: number;
    deliveryAddress: string;
    requestedDeliveryTime: number;
    assignmentStrategy: string;
    driverRankingThreshold: number;
}

interface CreateDeliveryResponse {
    success: boolean;
    delivery?: Delivery;
    details: string;
}

interface Delivery {
    id: string;
    vendorId: string;
    timestamp: number;
    pickUpAddress: string;
    pickUpTime: number;
    deliveryAddress: string;
    requestedDeliveryTime: number;
    assignedDriverId?: string;
    /**
     * Status of this delivery.  One of four values: unassigned, assigned, in_transit, delivered
     */
    status: string; // "unassigned", "assigned", "in_transit", "delivered"
    assignmentStrategy: string; // "auto" or "bids"
    driverRankingThreshold: number;
    actualDeliveryTime?: number;
}