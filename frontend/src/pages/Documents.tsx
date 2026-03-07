import { useEffect, useState } from 'react';
import { Box, Button, Card, Typography, Chip } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Upload } from '@mui/icons-material';
import api from '../config/api';
import { toast } from 'react-toastify';

export default function Documents() {
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const { data } = await api.get('/documents');
      setDocuments(data);
    } catch (error) {
      toast.error('Erreur de chargement');
    }
  };

  const columns: GridColDef[] = [
    { field: 'fileName', headerName: 'Fichier', width: 250 },
    { field: 'type', headerName: 'Type', width: 150 },
    { 
      field: 'patient', 
      headerName: 'Patient', 
      width: 200,
      valueGetter: (_value: any, row: any) => `${row.patient?.firstName} ${row.patient?.lastName}`,
    },
    { field: 'createdAt', headerName: 'Date', width: 180, valueFormatter: (params) => new Date(params).toLocaleString('fr-FR') },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      renderCell: (params) => (
        <Button size="small" href={params.row.fileUrl} target="_blank">
          Télécharger
        </Button>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Documents</Typography>
        <Button variant="contained" startIcon={<Upload />}>
          Upload Document
        </Button>
      </Box>

      <Card>
        <DataGrid rows={documents} columns={columns} autoHeight pageSizeOptions={[10, 20]} />
      </Card>
    </Box>
  );
}

