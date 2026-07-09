"use client";

import React from 'react';
import { MapPin, Clock, Phone, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useAdminData } from '@/lib/admin-data-context';



export const CampusDetails = () => {
  const { getSessionMember } = useAuth();
  const { campuses: dbCampuses } = useAdminData();
  const member = getSessionMember();
  
  // Get user's campus or default to main
  const userCampusId = member?.campusId || 'main';

  let displayCampuses = dbCampuses.filter(c => c.id === userCampusId);

  // Fallback if the user's campus ID doesn't explicitly match a database ID (e.g., 'main')
  if (displayCampuses.length === 0 && dbCampuses.length > 0) {
    const fallbackCampus = dbCampuses.find(c => c.name.toLowerCase().includes('central') || c.name.toLowerCase().includes('main')) || dbCampuses[0];
    displayCampuses = [fallbackCampus];
  }

  const openDirections = (latitude?: number, longitude?: number) => {
    if (latitude && longitude) {
      // ✅ Use coordinates
      const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
      window.open(url, '_blank');
    }
  };

  return (
    <section className="w-full">
      <div className="container mx-auto px-4">
        {/* Header removed for uniform design */}

        <div className="grid grid-cols-1 max-w-lg mx-auto gap-8">
          {displayCampuses.map((campus) => (
            <Card key={campus.id} className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-primary">
                  {campus.name}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Led by {campus.pastor}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Address */}
                {(campus.address || campus.city) && (
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">{campus.address || 'Address not provided'}</p>
                      <p className="text-muted-foreground">{campus.city} {campus.zipCode && `, ${campus.zipCode}`}</p>
                    </div>
                  </div>
                )}

                {/* Service Times */}
                {campus.serviceTimes && campus.serviceTimes.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-5 w-5 text-primary" />
                      <span className="font-medium text-foreground">Service Times</span>
                    </div>
                    {campus.serviceTimes.map((schedule, index) => (
                      <div key={index} className="ml-7">
                        <p className="font-medium text-foreground">{schedule.day}</p>
                        <p className="text-muted-foreground">
                          {schedule.times?.join(', ')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Contact Info */}
                <div className="space-y-2">
                  {campus.phone && (
                    <div className="flex items-center space-x-3">
                      <Phone className="h-4 w-4 text-primary" />
                      <a href={`tel:${campus.phone}`} className="text-primary hover:text-primary-glow transition-colors">
                        {campus.phone}
                      </a>
                    </div>
                  )}
                  {campus.email && (
                    <div className="flex items-center space-x-3">
                      <Mail className="h-4 w-4 text-primary" />
                      <a href={`mailto:${campus.email}`} className="text-primary hover:text-primary-glow transition-colors">
                        {campus.email}
                      </a>
                    </div>
                  )}
                </div>

                {/* Get Directions Button */}
                {campus.latitude && campus.longitude && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => openDirections(campus.latitude, campus.longitude)}
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Get Directions
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
