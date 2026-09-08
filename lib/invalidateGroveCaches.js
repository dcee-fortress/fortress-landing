import { invalidateMaterialScheduleCaches } from "@/lib/materialSchedule"
import { invalidateProjectDataCache } from "@/lib/projectData"
import { invalidateProjectsRegistryCache } from "@/lib/projectRegistry"

export function invalidateGroveCaches() {
  invalidateProjectsRegistryCache()
  invalidateProjectDataCache()
  invalidateMaterialScheduleCaches()
}
