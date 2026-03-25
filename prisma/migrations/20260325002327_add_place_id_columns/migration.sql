-- AlterTable
ALTER TABLE "families" ADD COLUMN     "divorce_place_id" UUID,
ADD COLUMN     "marriage_contract_place_id" UUID,
ADD COLUMN     "marriage_place_id" UUID;

-- AlterTable
ALTER TABLE "individuals" ADD COLUMN     "birth_place_id" UUID,
ADD COLUMN     "death_place_id" UUID;

-- AddForeignKey
ALTER TABLE "individuals" ADD CONSTRAINT "individuals_birth_place_id_fkey" FOREIGN KEY ("birth_place_id") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "individuals" ADD CONSTRAINT "individuals_death_place_id_fkey" FOREIGN KEY ("death_place_id") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "families" ADD CONSTRAINT "families_marriage_contract_place_id_fkey" FOREIGN KEY ("marriage_contract_place_id") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "families" ADD CONSTRAINT "families_marriage_place_id_fkey" FOREIGN KEY ("marriage_place_id") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "families" ADD CONSTRAINT "families_divorce_place_id_fkey" FOREIGN KEY ("divorce_place_id") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;
