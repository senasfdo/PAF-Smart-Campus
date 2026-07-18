package com.example.demo.repository;

import com.example.demo.model.Facility;
import com.example.demo.model.FacilityStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface FacilityRepository extends JpaRepository<Facility, Long> {

    // Find by type
    List<Facility> findByType(String type);

    // Find by status
    List<Facility> findByStatus(FacilityStatus status);

    // Find by location containing
    List<Facility> findByLocationContaining(String location);

    // Find by capacity greater than or equal
    List<Facility> findByCapacityGreaterThanEqual(Integer capacity);

    // Search with multiple filters
    @Query("SELECT f FROM Facility f WHERE " +
           "(:type IS NULL OR f.type = :type) AND " +
           "(:minCapacity IS NULL OR f.capacity >= :minCapacity) AND " +
           "(:location IS NULL OR f.location LIKE %:location%) AND " +
           "(:status IS NULL OR f.status = :status)")
    List<Facility> searchFacilities(@Param("type") String type,
                                    @Param("minCapacity") Integer minCapacity,
                                    @Param("location") String location,
                                    @Param("status") FacilityStatus status);
}