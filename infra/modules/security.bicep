// Reserved module for tenant-specific role assignments, resource locks, and policy
// remediations. These require approved deployment-identity ownership and are kept
// separate so application teams cannot silently elevate infrastructure access.
param location string
output deploymentRegion string = location

