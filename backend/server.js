const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Supabase credentials
const supabaseUrl = 'https://mjgqtckdqmclmlkrphsv.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZ3F0Y2tkcW1jbG1sa3JwaHN2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjU3NDEwMywiZXhwIjoyMDY4MTUwMTAzfQ.UDFIGhXubiPOnmrpBx_whik6q7LvUkRoIgnjTv6PVEQ';
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Endpoint to add a new school
app.post('/api/add-school', async (req, res) => {
  try {
    const { name, location, latitude, longitude, price, unavailable_days, image, is_top, is_featured } = req.body;

    // Validate required fields
    if (!name || !location || !price) {
      return res.status(400).json({ error: 'Name, location, and price are required' });
    }
    if (typeof is_top !== 'boolean') {
      return res.status(400).json({ error: 'is_top must be a boolean' });
    }
    if (typeof is_featured !== 'boolean') {
      return res.status(400).json({ error: 'is_featured must be a boolean' });
    }
    if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
      return res.status(400).json({ error: 'Latitude must be a number between -90 and 90' });
    }
    if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: 'Longitude must be a number between -180 and 180' });
    }

    let imageUrl = null;
    if (image) {
      const base64Data = image.replace(/^data:image\/png;base64,/, '');
      const imageName = `${Date.now()}-${name.replace(/\s+/g, '-')}.png`;

      const { data, error } = await supabase.storage
        .from('school-images')
        .upload(imageName, Buffer.from(base64Data, 'base64'), {
          contentType: 'image/png',
        });

      if (error) {
        console.error('Storage error:', error);
        return res.status(500).json({ error: 'Failed to upload image' });
      }

      const { data: publicUrlData } = supabase.storage
        .from('school-images')
        .getPublicUrl(imageName);
      imageUrl = publicUrlData.publicUrl;
    }

    const { data, error } = await supabase
      .from('schools')
      .insert([
        {
          name,
          location,
          latitude, // Store latitude
          longitude, // Store longitude
          price,
          unavailable_days: unavailable_days || 'None',
          image_url: imageUrl,
          admissions: 0,
          is_top,
          is_featured,
        },
      ])
      .select();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to add school to database' });
    }

    res.status(200).json({ message: 'School added successfully', school: data[0] });
  } catch (err) {
    console.error('Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to toggle is_top status
app.patch('/api/toggle-top-school/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_top } = req.body;

    if (typeof is_top !== 'boolean') {
      return res.status(400).json({ error: 'is_top must be a boolean' });
    }

    const { data, error } = await supabase
      .from('schools')
      .update({ is_top })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to update school' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'School not found' });
    }

    res.status(200).json({ message: 'School updated successfully', school: data[0] });
  } catch (err) {
    console.error('Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to toggle is_featured status
app.patch('/api/toggle-featured-school/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_featured } = req.body;

    if (typeof is_featured !== 'boolean') {
      return res.status(400).json({ error: 'is_featured must be a boolean' });
    }

    const { data, error } = await supabase
      .from('schools')
      .update({ is_featured })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to update school' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'School not found' });
    }

    res.status(200).json({ message: 'School updated successfully', school: data[0] });
  } catch (err) {
    console.error('Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});